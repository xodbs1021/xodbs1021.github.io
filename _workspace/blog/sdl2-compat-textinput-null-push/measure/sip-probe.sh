#!/bin/sh
# make 에 준 DYLD_LIBRARY_PATH 가 레시피의 자식 프로그램에 닿는지 본다(macOS).
# 작업 폴더는 SIPW_DIR(기본 /tmp/sdlw-sip). 끝나면 그 폴더를 지워도 된다.
set -eu
D=${SIPW_DIR:-/tmp/sdlw-sip}
mkdir -p "$D"
cd "$D"
cat > envprobe.c <<'C'
#include <stdio.h>
#include <stdlib.h>
int main(int argc, char **argv) {
  const char *v = getenv("DYLD_LIBRARY_PATH");
  printf("%s: DYLD_LIBRARY_PATH=%s\n", argc > 1 ? argv[1] : "probe", v ? v : "(unset)");
  return 0;
}
C
cc -O0 -o envprobe envprobe.c
# 첫 줄은 make 가 셸 없이 바로 실행하고, 둘째 줄은 ';' 때문에 /bin/sh -c 로 실행한다.
printf 'all:\n\t./envprobe recipe-direct-exec\n\t./envprobe recipe-via-sh; true\n' > Makefile
V=$D/fake-lib-dir
CLT_MAKE=$(xcrun -f make)

echo "## system"; sw_vers; uname -m; csrutil status
echo "## file flags (restricted = SIP 보호)"; ls -lO /usr/bin/make /bin/sh "$CLT_MAKE"
echo "## 1. 직접 실행";                    DYLD_LIBRARY_PATH=$V ./envprobe direct
echo "## 2. /bin/sh -c";                    DYLD_LIBRARY_PATH=$V /bin/sh -c './envprobe child-of-bin-sh'
echo "## 3. /usr/bin/make (xcrun 심)";      DYLD_LIBRARY_PATH=$V /usr/bin/make -s
echo "## 4. $CLT_MAKE (보호 안 됨)";        DYLD_LIBRARY_PATH=$V "$CLT_MAKE" -s
echo "## 5. make 명령줄 변수";              /usr/bin/make -s DYLD_LIBRARY_PATH=$V
