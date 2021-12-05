#!/bin/bash

cd $(dirname $0)

# For Chrome
NMH_CONF_DIR=~/.config/google-chrome/NativeMessagingHosts/
# For Brave
# NMH_CONF_DIR=~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/

MANIFEST=com.github.ihiroky.system_monitor.json

sed -e "s#COLLECTOR_PATH#$(cd ..; pwd)/dist/collector#" < ../src/$MANIFEST >$NMH_CONF_DIR/$MANIFEST
