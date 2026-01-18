

FROM node:18

# প্রয়োজনীয় সফটওয়্যার ইন্সটল করা
RUN apt-get update && apt-get install -y \
    libreoffice \
    tesseract-ocr \
    ghostscript \
    qpdf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# package.json কপি করে লাইব্রেরি ইন্সটল করা
COPY package*.json ./
RUN npm install

# সব কোড কপি করা
COPY . .

# ফোল্ডার তৈরি করা
RUN mkdir -p uploads outputs

EXPOSE 3000

# সার্ভার স্টার্ট করা
CMD ["node", "server.js"]
