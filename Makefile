all:
	bash build.sh --production
	echo
	echo ">>> DONE"
	echo
	bash build.sh --production --asm
