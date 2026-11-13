/* nowns: print CLOCK_REALTIME in nanoseconds */
#include <stdio.h>
#include <time.h>
int main(void){struct timespec t;clock_gettime(CLOCK_REALTIME,&t);printf("%lld\n",(long long)t.tv_sec*1000000000LL+t.tv_nsec);return 0;}
