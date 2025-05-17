.PHONY: deploy

deploy:
	rm -rf dist web-ext-artifacts
	npm run build
	npm run package
