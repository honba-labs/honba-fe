# Dev helpers. Override on the command line: make dev DATA_DIR=/path/to/parquet/bars
DATA_DIR ?= ../honba-data/data
JOURNALS_DIR ?= ../honba-data/data/journals
# API_ADDR must match the proxy target in apps/web/vite.config.ts
API_ADDR ?= 127.0.0.1:8000

.PHONY: api web dev

# Backend only (honba-ya serve)
api:
	cd ../honba-ya && cargo run -p honba-ya-cli -- serve \
		--data-dir $(abspath $(DATA_DIR)) \
		--journals-dir $(abspath $(JOURNALS_DIR)) \
		--addr $(API_ADDR) --cors-origin http://localhost:5175

# Frontend only (vite, apps/web)
web:
	npm run dev

# Both together; Ctrl-C stops both
dev:
	$(MAKE) -j2 api web
