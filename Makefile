.PHONY: build

build:
	npx tsgo
	cp static/* dist/
	./helpers/postbuilder/target/release/postbuilder


