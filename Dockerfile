# syntax = docker/dockerfile:1

# Base stage for shared configurations
FROM ruby:3.2.2-slim as base

# Install essential packages and Node.js
RUN apt-get update -qq && \
    apt-get install -y build-essential libpq-dev curl gnupg2 && \
    # Install Node.js and npm
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest && \
    # Clean up
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Rails app lives here
WORKDIR /rails

# Set production environment
ENV RAILS_ENV="production" \
    BUNDLE_WITHOUT="development" \
    NODE_ENV="production"

# Builder stage for asset compilation
FROM base as builder

# Install application gems
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Install npm packages
COPY package.json package-lock.json ./
RUN npm install

# Copy application code
COPY . .

# Precompile bootsnap code for faster boot times
RUN bundle exec bootsnap precompile app/ lib/

# Adjust binaries to be executable
RUN chmod +x bin/* && \
    sed -i "s/\r$//g" bin/* && \
    sed -i 's/ruby\.exe$/ruby/' bin/*

# Build Vite assets first
RUN npm run build

# Then precompile Rails assets
RUN SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile

# Final stage
FROM base

# Copy over artifacts from builder
COPY --from=builder /usr/local/bundle /usr/local/bundle
COPY --from=builder /rails /rails
COPY --from=builder /rails/node_modules /rails/node_modules
COPY --from=builder /rails/public/vite /rails/public/vite

# Create and set non-root user
RUN groupadd --system --gid 1000 rails && \
    useradd --system --gid rails --uid 1000 rails && \
    chown -R rails:rails db log storage tmp public
USER rails:rails

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD ["./bin/rails", "server"]
