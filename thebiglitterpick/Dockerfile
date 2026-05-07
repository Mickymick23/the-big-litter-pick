FROM php:8.2-apache

# install system dependencies needed for PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && docker-php-ext-install pgsql pdo pdo_pgsql

# enable Apache rewrite
RUN a2enmod rewrite

# copy project into web root
COPY . /var/www/html/

EXPOSE 80
