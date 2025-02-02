# Create Archive HTML Email

<p align="center">
  <img src="https://i.postimg.cc/8PwmHr4W/Screenshot-2024-05-31-152732.png" width="400px" border='0' alt='Screenshot-2024-04-25-123930'/>
</p>

Cahe (**C**reate **A**rchive **H**TML **E**mail) — это CLI инструмент для создания архивов HTML-рассылок. Он уменьшает размер HTML, проверяет ссылки(href), переносит CSS-свойства в атрибут style HTML-элементов, обрабатывает изображения (сжатие, изменение размера, конвертация svg) и упаковывает всё в ZIP-файл. Так же есть возможность создать веб-версию письма. Подходит для работы с [Unisender](https://www.unisender.com/) и другими похожими сервисами.

## 🛠 Технологии:

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Archiver](https://www.archiverjs.com/)
- [Email-comb](https://codsen.com/os/email-comb)
- [Juice](https://github.com/Automattic/juice)
- [Sharp](https://sharp.pixelplumbing.com/)
- [Signale](https://github.com/klaudiosinani/signale)
- [Extract-zip](https://github.com/max-mapper/extract-zip)
- [Clipboardy](https://github.com/sindresorhus/clipboardy)
- [Dotenv](https://github.com/motdotla/dotenv)
- [Commander.js](https://github.com/tj/commander.js)
- [Encode-emojis](https://github.com/simbo/encode-emojis)

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

4. Чтобы собрать проект, воспользуйтесь следующей командой:
```bash
npm run build
```

5. Сделайте файл cahe.js исполняемым:

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

Архив .zip создастся в каталоге, где находится HTML-файл и путь к нему автоматически сохранится в буфер обмена.

**Если нужно извлечь содержимое архива, укажите флаг **-e** после пути к HTML-файлу:**

```bash
cahe file.html -e
```

Или просто укажите путь к ZIP-файлу:

```bash
cahe file.zip
```

Архива будет извлечен в каталог /build, где лежит HTML-файл.

**Как автоматически изменять размер изображений**

Добавьте в HTML элементу img атрибут data-width с нужной шириной в px.

```html
<img src="images/banner.png" width="100%" data-width="600" />
```

Скрипт изменит разрешение фотографии, подгонит ширину в 600px и сохранит в архив, исходный файл не изменится.

**Если нужно создать веб-версию письма:**

1. В корне директории /cahe создайте файл .env.
2. В файле .env укажите ваш ключ:

```env
WEBLETTER_TOKEN=ваш_токен
WEBLETTER_URL=путь_до_сервера
```

4. При необходимости можно также указать прокси:

```env
PROXY=адрес_прокси
```

5. В терминале укажите флаг **-w** после пути к HTML-файлу:

```bash
cahe file.html -w
```

Так же можно сразу указать путь до архива в формате .zip(другие форматы не подходят)

```bash
cahe file.zip -w
```

Файл config.json создастся в каталоге, где находится HTML файл. Внутри будет ссылка на веб-версию письма, а также в консоли при завершении.
Последующие правки будут изменятся по той же ссылке. Если нужно создать новую ссылку, удалите config.json файл или удалите в нем строчку **siteID**

## 🧾[MIT Licensed](https://github.com/rastereo/cahe/blob/main/LICENSE)
