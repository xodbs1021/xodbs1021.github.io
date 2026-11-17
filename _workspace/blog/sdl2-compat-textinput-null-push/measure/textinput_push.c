/*
 * textinput_push.c — SDL2 API 로 SDL_TEXTINPUT 이벤트를 넣어 보는 최소 프로그램.
 *
 * 빌드: SDL 2.32.10 헤더(include/)로 컴파일하고 libSDL2-2.0.0.dylib 에 링크한다.
 * 실행: textinput_push <mode> [video]
 *   mode = keydown   : SDL_KEYDOWN 을 SDL_PushEvent (대조)
 *          textinput : SDL_TEXTINPUT 을 SDL_PushEvent (문제의 경로)
 *          peep      : SDL_TEXTINPUT 을 SDL_PeepEvents(SDL_ADDEVENT) 로 넣기
 *          user      : SDL_RegisterEvents 로 받은 사용자 이벤트에 문자열을 실어 SDL_PushEvent (회피책 후보)
 *   video = SDL_INIT_VIDEO 로 초기화하고 SDL_StartTextInput() 을 부른다(기본은 SDL_INIT_EVENTS 만).
 *   환경 변수 TEXT_INPUT_TEXT 로 넣을 글자를 바꾼다(기본 "a").
 *
 * 이벤트는 SDL_zero 로 0 으로 채운 뒤 필드를 넣고, 글자는 SDL_strlcpy 로
 * text[SDL_TEXTINPUTEVENT_TEXT_SIZE](32바이트) 안에서 NUL 로 끝낸다.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "SDL.h"

/* 넣을 글자. TEXT_INPUT_TEXT 로 바꿀 수 있다(31바이트까지 담긴다). */
static const char *kText = "a";

static void print_versions(void)
{
    SDL_version compiled, linked;
    SDL_VERSION(&compiled);
    SDL_GetVersion(&linked);
    printf("compiled-against SDL %u.%u.%u\n", compiled.major, compiled.minor, compiled.patch);
    printf("linked SDL_GetVersion %u.%u.%u\n", linked.major, linked.minor, linked.patch);
    printf("SDL_GetRevision %s\n", SDL_GetRevision());
    printf("sizeof(SDL_Event) %zu, sizeof(SDL_TextInputEvent) %zu\n",
           sizeof(SDL_Event), sizeof(SDL_TextInputEvent));
    fflush(stdout);
}

static int drain(void)
{
    SDL_Event ev;
    int n = 0;
    while (SDL_PollEvent(&ev)) {
        if (ev.type == SDL_TEXTINPUT) {
            printf("poll: SDL_TEXTINPUT text=\"%s\"\n", ev.text.text);
        } else if (ev.type == SDL_KEYDOWN) {
            printf("poll: SDL_KEYDOWN sym=0x%x\n", (unsigned)ev.key.keysym.sym);
        } else if (ev.type >= SDL_USEREVENT) {
            printf("poll: user event 0x%x code=%d text=\"%s\"\n",
                   (unsigned)ev.type, ev.user.code, (const char *)ev.user.data1);
        } else {
            continue; /* 창·기기 이벤트 등은 세지 않는다 */
        }
        n++;
    }
    printf("poll: %d matching event(s)\n", n);
    fflush(stdout);
    return n;
}

static int push_and_report(SDL_Event *ev)
{
    printf("calling SDL_PushEvent(type=0x%x)\n", (unsigned)ev->type);
    fflush(stdout);
    int rc = SDL_PushEvent(ev);
    printf("SDL_PushEvent returned %d%s%s\n", rc, rc < 0 ? " error=" : "", rc < 0 ? SDL_GetError() : "");
    fflush(stdout);
    return rc;
}

int main(int argc, char **argv)
{
    const char *mode = argc > 1 ? argv[1] : "textinput";
    int use_video = argc > 2 && strcmp(argv[2], "video") == 0;
    Uint32 flags = use_video ? SDL_INIT_VIDEO : SDL_INIT_EVENTS;
    const char *text_override = getenv("TEXT_INPUT_TEXT");
    if (text_override && *text_override) {
        kText = text_override;
    }

    if (SDL_Init(flags) != 0) {
        fprintf(stderr, "SDL_Init failed: %s\n", SDL_GetError());
        return 2;
    }
    print_versions();
    printf("mode %s, init %s\n", mode, use_video ? "VIDEO" : "EVENTS");
    if (use_video) {
        SDL_StartTextInput();
    }
    printf("SDL_EventState(SDL_TEXTINPUT) %d\n", SDL_EventState(SDL_TEXTINPUT, SDL_QUERY));
    drain(); /* 초기화 때 들어온 이벤트를 비운다 */

    SDL_Event ev;
    SDL_zero(ev);
    if (strcmp(mode, "keydown") == 0) {
        ev.type = SDL_KEYDOWN;
        ev.key.timestamp = SDL_GetTicks();
        ev.key.state = SDL_PRESSED;
        ev.key.keysym.scancode = SDL_SCANCODE_A;
        ev.key.keysym.sym = SDLK_a;
        push_and_report(&ev);
    } else if (strcmp(mode, "textinput") == 0) {
        ev.type = SDL_TEXTINPUT;
        ev.text.timestamp = SDL_GetTicks();
        ev.text.windowID = 0;
        SDL_strlcpy(ev.text.text, kText, sizeof(ev.text.text));
        push_and_report(&ev);
    } else if (strcmp(mode, "peep") == 0) {
        ev.type = SDL_TEXTINPUT;
        ev.text.timestamp = SDL_GetTicks();
        SDL_strlcpy(ev.text.text, kText, sizeof(ev.text.text));
        printf("calling SDL_PeepEvents(SDL_ADDEVENT, type=0x%x)\n", (unsigned)ev.type);
        fflush(stdout);
        int rc = SDL_PeepEvents(&ev, 1, SDL_ADDEVENT, 0, 0);
        printf("SDL_PeepEvents returned %d\n", rc);
        fflush(stdout);
    } else if (strcmp(mode, "user") == 0) {
        static char payload[SDL_TEXTINPUTEVENT_TEXT_SIZE];
        Uint32 type = SDL_RegisterEvents(1);
        if (type == (Uint32)-1) {
            fprintf(stderr, "SDL_RegisterEvents failed\n");
            SDL_Quit();
            return 2;
        }
        SDL_strlcpy(payload, kText, sizeof(payload));
        ev.type = type;
        ev.user.timestamp = SDL_GetTicks();
        ev.user.code = 1;
        ev.user.data1 = payload; /* 문자열은 호출자가 소유한다 */
        push_and_report(&ev);
    } else {
        fprintf(stderr, "unknown mode %s\n", mode);
        SDL_Quit();
        return 2;
    }

    int got = drain();
    SDL_Quit();
    printf("exit normally\n");
    return got == 1 ? 0 : 1;
}
