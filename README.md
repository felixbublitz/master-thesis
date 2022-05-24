<h1>master thesis</h1>

<p>documentation: https://www.overleaf.com/read/fxgfqshkgxss</p>

</div>

  

<h2 >Installation</h2>
Install dependencies: 

```bash
npm ci
```

build app and libraries: 

```bash
npm run build-library
npm run build
```

run app: 

```bash
npm ./dist/server.js
```

<h2>Usage</h2>

```bash
127.0.0.1/sender # App that initializes the video call
127.0.0.1/receiver # App that receives the video call
```