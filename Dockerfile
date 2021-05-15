FROM node:8.4.0

# Create node directory
RUN mkdir /node
WORKDIR /node

# Install app dependencies
COPY . /node
# RUN npm config set registry "http://registry.cnpmjs.org"
RUN npm install -g forever && npm install

EXPOSE 8080
CMD  forever /node/src/server.js
