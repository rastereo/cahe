# Create Archive HTML Email

<p align="center">
  <img src='https://i.postimg.cc/J7vzyQFc/Screenshot-2024-04-25-123930.png' width="300px" border='0' alt='Screenshot-2024-04-25-123930'/>
</p>

Cahe (Create Archive HTML Email) — это простой инструмент для автоматизации создания архивов HTML-почтовых рассылок. Он минифицирует HTML, инлайнит CSS, автоматически обрабатывает изображения (сжатие, изменение размера, конвертация) и упаковывает всё в ZIP-архив. Этот инструмент идеально подходит для работы с Unisender.

## 🛠 Технологии:

+ [Node.js](https://nodejs.org/)
+ [Archiver](https://www.archiverjs.com/)
+ [Email-comb](https://codsen.com/os/email-comb)
+ [Juice](https://github.com/Automattic/juice)
+ [Sharp](https://sharp.pixelplumbing.com/)
+ [Signale](https://github.com/klaudiosinani/signale)
+ [Extract-zip](https://github.com/max-mapper/extract-zip)
+ [Clipboardy](https://github.com/sindresorhus/clipboardy)
+ [Dotenv](https://github.com/motdotla/dotenv)
+ [ESLint](https://eslint.org/)

## 💾 Установка:

Перед использованием убедитесь, что у вас установлен Node.js.

1. Склонируйте репозиторий:
```bash
git clone https://github.com/rastereo/cahe.git
```
2. Перейдите в директорию проекта:
```bash
cd cahe
```
3. Установите зависимости:
```bash
npm install
```
4. Сделайте файл cahe.js исполняемым:
```bash
npm run init
```

## 🤖Использование:

Запустите скрипт в терминале, указав абсолютный путь к HTML-файлу:
```bash
cahe "C:\path\to\your\file.html"
```
Так же можно указать относительный путь:
```bash
cahe file.html
```
Файл .zip создастся в каталоге, где находится HTML файл и путь к нему автоматически сохранится в буфер обмена.

**Если нужно извлечь содержимое архива, укажите флаг **-e** после пути к HTML-файлу:**
```bash
cahe file.html -e
```
Или просто укажите путь к ZIP-файлу:
```bash
cahe file.zip
```
Архива будет извлечен в каталог /build.

**Если нужно создать веб-версию письма:**
1. Зарегистрируйтесь на сайте [Netlify](https://app.netlify.com/user/applications#personal-access-tokens) и получите токен.
2. В корне директории /cahe создайте файл .env.
3. В файле .env укажите ваш ключ:
```env
NETLIFY_KEY=ваш_ключ_api
```
4. При необходимости можно также указать прокси:
```env
PROXY=адрес_прокси
```
5.В терминале укажите флаг **-w** после пути к HTML-файлу:
```bash
cahe file.html -w
```
Файл config.json создастся в каталоге, где находится HTML файл. Внутри будет ссылка на веб-версию письма, а также в консоли при завершении.
Последующие правки будут изменятся по той же ссылке. Если нужно создать новую ссылку, удалите config.json файл или удалите  в нем строчку **siteID**
