#!/bin/bash

DB=/var/lib/postgres/data
dbname=iotproject
dbowner=iotadmin
dbuser=iotapi

install_pkgs() {
	# Arch Linux only
	sudo pacman -S postgresql
}

createdb() {
	sudo chattr +C $DB
	sudo -u postgres -- initdb --locale C.UTF-8 --encoding=UTF8 -D $DB --data-checksums
}

configure_users() {
	sudo -u postgres -- createuser --pwprompt $dbowner
	sudo -u postgres -- createuser --pwprompt $dbuser
	sudo -u postgres -- createdb --owner=$dbowner $dbname
}

configure_db_auth() {
	# TYPE  DATABASE USER     CIDR-ADDRESS METHOD
	sudo -u postgres -- tee --append $DB/pg_hba.conf <<-EOF
	hostssl $dbname  $dbowner 127.0.0.1/32 scram-sha-256
	hostssl $dbname  $dbuser  191.148.96.0/20 scram-sha-256
	EOF
}

install_pkgs
createdb
configure_users
configure_db_auth

