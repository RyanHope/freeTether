#include <stdio.h>

#ifndef APP_ID
#error Must define APP_ID macro
#endif

int main(int argc, char **argv) {
  if (luna_service_initialize(APP_ID))
    luna_service_start();

  return 0;
}
