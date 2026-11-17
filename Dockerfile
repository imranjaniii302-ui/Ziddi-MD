FROM node:lts-bookworm
USER root
RUN apt-get update && \
    apt-get install -y ffmpeg webp git && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*
COPY --chown=node:node . /home/node/DJ
USER node
WORKDIR /home/node/DJ
RUN chmod -R 777 /home/node/DJ/
RUN npm install --no-audit --no-fund
EXPOSE 7860
ENV NODE_ENV=production
CMD ["npm", "start"]
