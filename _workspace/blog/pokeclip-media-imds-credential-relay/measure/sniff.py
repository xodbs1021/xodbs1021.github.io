"""같은 망 칸의 이웃이 창구와 소비자 사이의 평문 HTTP 를 엿볼 수 있는지 본다(공개 재측정 E).

  sniff.py <초>

AF_PACKET 원시 소켓(NET_RAW 권한 필요)으로 그 망 칸의 모든 패킷을 받아, 정해진 시간 동안
「Authorization: 머리」 와 「자격 JSON(SecretAccessKey)」 이 보였는지만 센다. 값은 남기지 않는다.
소켓을 열지 못하면(권한 없음) 그 오류 종류만 남긴다.
"""

import json
import socket
import sys
import time

ETH_P_ALL = 0x0003


def main(seconds):
    try:
        s = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.htons(ETH_P_ALL))
    except OSError as e:
        print(json.dumps({"sniff_open": False, "err": f"{type(e).__name__} errno={e.errno}"}), flush=True)
        return
    print(json.dumps({"sniff_open": True}), flush=True)
    s.settimeout(0.5)
    auth = creds = packets = 0
    end = time.time() + seconds
    while time.time() < end:
        try:
            data = s.recv(65535)
        except socket.timeout:
            continue
        packets += 1
        if b"Authorization:" in data or b"authorization:" in data:
            auth += 1
        if b"SecretAccessKey" in data:
            creds += 1
    print(json.dumps({"packets": packets, "auth_header_packets": auth, "creds_json_packets": creds}), flush=True)


if __name__ == "__main__":
    main(float(sys.argv[1]))
