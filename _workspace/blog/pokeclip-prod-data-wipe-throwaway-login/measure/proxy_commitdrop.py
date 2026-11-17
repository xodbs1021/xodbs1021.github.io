#!/usr/bin/env python3
"""COMMIT 응답을 떨어뜨리는 TCP 프록시.

psql <-> (이 프록시) <-> PostgreSQL.
서버가 보내는 메시지를 파싱해 CommandComplete('C') 태그가 'COMMIT' 이면,
그 메시지와 그 뒤(ReadyForQuery)를 클라이언트로 보내지 않고 양쪽을 닫는다.
서버는 이미 커밋했지만 psql 은 응답을 못 받아 연결 오류로 끝난다(종료 2).

사용: proxy_commitdrop.py <listen_port> <pg_host> <pg_port>
"""
import socket
import sys
import threading

listen_port = int(sys.argv[1])
pg_host = sys.argv[2]
pg_port = int(sys.argv[3])


def pump_client_to_server(cli, srv):
    try:
        while True:
            data = cli.recv(65536)
            if not data:
                break
            srv.sendall(data)
    except OSError:
        pass


def pump_server_to_client(srv, cli):
    """서버→클라이언트. CommandComplete(COMMIT) 를 만나면 그 앞까지만 보내고 끊는다."""
    buf = b""
    try:
        while True:
            data = srv.recv(65536)
            if not data:
                break
            buf += data
            # 완전한 메시지 단위로 파싱한다. 서버 메시지 = [1][len:4][payload]
            while len(buf) >= 5:
                mtype = buf[0:1]
                mlen = int.from_bytes(buf[1:5], "big")
                if len(buf) < 1 + mlen:
                    break  # 아직 덜 왔다
                msg = buf[: 1 + mlen]
                payload = msg[5:]
                if mtype == b"C" and payload.startswith(b"COMMIT"):
                    # 커밋 완료 응답 도착 → 보내지 않고 즉시 끊는다
                    print("proxy: COMMIT CommandComplete seen -> dropping ack", file=sys.stderr, flush=True)
                    try:
                        cli.shutdown(socket.SHUT_RDWR)
                    except OSError:
                        pass
                    try:
                        srv.shutdown(socket.SHUT_RDWR)
                    except OSError:
                        pass
                    return
                cli.sendall(msg)
                buf = buf[1 + mlen :]
    except OSError:
        pass


def handle(cli):
    srv = socket.create_connection((pg_host, pg_port))
    t1 = threading.Thread(target=pump_client_to_server, args=(cli, srv), daemon=True)
    t2 = threading.Thread(target=pump_server_to_client, args=(srv, cli), daemon=True)
    t1.start()
    t2.start()
    t2.join()
    try:
        cli.close()
    except OSError:
        pass
    try:
        srv.close()
    except OSError:
        pass


def main():
    ls = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    # 전용 docker 망 안의 컨테이너에서만 돈다(호스트 포트를 열지 않는다).
    ls.bind(("", listen_port))
    ls.listen(8)
    sys.stderr.write(f"proxy: listening on :{listen_port} -> {pg_host}:{pg_port}\n")
    sys.stderr.flush()
    while True:
        cli, _ = ls.accept()
        threading.Thread(target=handle, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
