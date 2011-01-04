#!/bin/sh

umount /tmp/freetether/proc
rm -rf /tmp/freetether/proc
umount /proc/sys/net/ipv4/ip_forward
umount /usr/bin/mobilehotspotd
luna-send -n 1 palm://com.palm.dhcp/interfaceFinalize '{"interface":"bridge0"}'
iptables -t nat --flush
echo 0 > /proc/sys/net/ipv4/ip_forward
luna-send -n 1 palm://com.palm.netroute/removeNetIf '{"ifName":"bridge0"}'
#luna-send -n 1 palm://com.palm.wifi/setstate '{"state":"enabled"}'
ifconfig bridge0 down
brctl delbr bridge0
