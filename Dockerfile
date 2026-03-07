FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=3338
EXPOSE 3338
CMD ["npm", "start"]
