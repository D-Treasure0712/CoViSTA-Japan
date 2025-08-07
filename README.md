# CoViSTA Japan

A web application for tracking and visualizing SARS-CoV-2 variant distribution and evolution across Japan. This platform provides genomic surveillance data at both national and prefectural levels, displaying the temporal dynamics of viral lineages through interactive charts, heatmaps, and summary tables. The system consists of two main components: a data processing tool that organizes GISAID sequence data by prefecture and week, and a visualization tool that generates four different graphical representations of variant prevalence. Designed to support public health officials, researchers, and the general public in understanding the regional characteristics of COVID-19 variants in Japan.

build or rebuild : docker compose up --build
（from the second time : docker compose up）

access : http://localhost:3000

stop : Ctrl+C or docker-compose down

# 1