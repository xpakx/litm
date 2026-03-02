.PHONY: build serve clean

build:
	npx tsgo
	cp static/* dist/
	./helpers/postbuilder/target/release/postbuilder

serve:
	python3 -m http.server --directory dist 8080

clean:
	rm -rf dist/*
