# Colors for prettier output
GREEN = \033[0;32m
RED = \033[0;31m
YELLOW = \033[1;33m
RESET = \033[0m

# Docker compose file path
COMPOSE_FILE = docker-compose.yml

# Target names
all: build up

# Build the Docker images
build:
	@printf "$(GREEN)Building Docker images...$(RESET)\n"
	@docker compose -f $(COMPOSE_FILE) build

# Start the containers
up:
	@printf "$(GREEN)Starting containers...$(RESET)\n"
	@docker compose -f $(COMPOSE_FILE) up -d

# Stop the containers
down:
	@printf "$(RED)Stopping containers...$(RESET)\n"
	@docker compose -f $(COMPOSE_FILE) down

# Stop and remove containers, networks, and volumes
clean: down
	@printf "$(RED)Cleaning up containers, networks, and volumes...$(RESET)\n"
	@docker compose -f $(COMPOSE_FILE) down -v
	@docker system prune -af

fclean: clean
	@printf "$(RED)Warning: This will remove ALL unused Docker volumes and images!$(RESET)\n"
	@read -p "Do you wish to proceed? (yes/no): " choice && [ "$$choice" = "yes" ] && { \
		printf "$(RED)Pruning all unused Docker volumes...$(RESET)\n"; \
		docker volume prune -f; \
		printf "$(RED)Pruning all unused Docker images...$(RESET)\n"; \
		docker image prune -af; \
	} || printf "$(YELLOW)Aborted. No volumes or images were removed.$(RESET)\n"

# Restart all services
re: fclean all

# Show container status
status:
	@docker compose -f $(COMPOSE_FILE) ps

# Show container logs
logs:
	@docker compose -f $(COMPOSE_FILE) logs

.PHONY: all setup build up down clean fclean re status logs