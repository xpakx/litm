.PHONY: build

build:
	npx tsgo
	cp static/* dist/
