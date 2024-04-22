// import indexHtml from '../public/index.html'

addEventListener('fetch', event => {
    event.passThroughOnException();
    event.respondWith(handleRequest(event.request));
  })
  
  // const DEV = true;
  const DEV = false;
  if (!DEV) {
    console.log = () => {};
    console.error = () => {};
  }
  
  async function handleRequest(request) {
    let url = new URL(request.url);
    console.log(`%c[${request.method}] ${request.url}`, 'color:red');
    const VALID_URL_REG = /(https?:\/\/[^/]+)\/?/;
    const BASE = url.origin;
    const PROXY_URL = request.url.replace(BASE + '/', '');
  
    if (!VALID_URL_REG.test(PROXY_URL)) {
      return createLandingPage(request);
    }
  
    let reqHeaders = new Headers(request.headers),
      originalHeader = reqHeaders.get('Access-Control-Allow-Headers'),
      outBody, outStatus = 200, outStatusText = 'OK', outCt = null,
      outHeaders = new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": originalHeader ? (originalHeader + ', Modifyheaders') : "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token, Modifyheaders"
        // "Access-Control-Allow-Headers": "*"
      });
  
    try {
      url = PROXY_URL;
      const _url = new URL(url);
      console.log("ACTURAL: " + url, _url)
  
      //需要忽略的代理
      if (request.method == "OPTIONS" || url == "favicon.ico" || url == "robots.txt") {
        //输出提示
        console.log("%cGOODBYE " + url, "color:gray");
        const invalid = !(request.method == "OPTIONS" || url.length === 0)
        if (!invalid)
          return errorJson(url, 200, outHeaders);
        return createLandingPage(request);
      }
      else {
        //构建 fetch 参数
        let fp = {
          method: request.method,
          headers: {}
        }
  
        //保留头部其它信息
        const dropHeaders = ['modifyheaders'];
        let he = reqHeaders.entries();
        let modifyHeaders = {};
        for (let h of he) {
          const key = h[0], value = h[1], keyLow = key.toLowerCase();
          // 自定义header
          if (keyLow == 'modifyheaders') {
            modifyHeaders = JSON.parse(value);
          }
          if (!dropHeaders.includes(key)) {
            if (keyLow == 'host' || keyLow == 'origin') {
              fp.headers[key] = _url[key];
            } else if (keyLow == 'referer') {
              fp.headers[key] = url;
            } else {
              fp.headers[key] = value;
            }
          }
        }
        for (let key in modifyHeaders) {
          fp.headers[key] = modifyHeaders[key];
        }
  
        console.log("%cPROXY TO URL " + url, 'color:blue');
  
        if (["POST", "PUT", "PATCH", "DELETE"].indexOf(request.method) >= 0) {
          const ct = (reqHeaders.get('content-type') || "").toLowerCase();
          if (ct.includes('application/json')) {
            fp.body = JSON.stringify(await request.json());
          } else if (ct.includes('application/text') || ct.includes('text/html')) {
            fp.body = await request.text();
          } else if (ct.includes('form')) {
            fp.body = await request.formData();
          } else {
            fp.body = await request.blob();
          }
        }
  
        console.log('requsetheaders: ', fp.headers);
        // 发起 fetch
        let fr = (await fetch(url, fp));
        console.log("=====PROXY RESULT: ", fr)
        let responseHeaders = new Headers(fr.headers)
        const hsss = [];
        responseHeaders.forEach((value, key) => {
          outHeaders.set(key, value);
          hsss.push({key, value});
        })
        console.log(hsss);
        outHeaders = fr.headers;
        outCt = fr.headers.get('content-type');
        outStatus = fr.status;
        outStatusText = fr.statusText;
        outBody = fr.body;
      }
    } catch (err) {
      outCt = "application/json";
      outBody = JSON.stringify({
        code: -1,
        msg: JSON.stringify(err.stack) || err
      });
      outStatus = 500;
      console.error(err)
      return errorJson(url, 500, outHeaders, err);
    }
  
    //设置类型
    // if (outCt && outCt != "") {
    //   outHeaders.set("content-type", outCt);
    // }
  
    let response = new Response(outBody, {
      status: outStatus,
      statusText: outStatusText,
      headers: outHeaders
    })
  
    return response;
  }
  
  function errorJson(url, status, outHeaders, error = '') {
    outBody = JSON.stringify({
        code: status,
        usage: 'Host/{URL}',
        originalProject: 'https://github.com/netnr/workers',
        project: 'https://github.com/Gwen0x4c3/cloudflare-proxy-all',
        note: 'Blocking a large number of requests, please deploy it yourself',
        error: `Error when visiting ${url} -- ${error}`,
    });
    outHeaders.set("content-type", 'application/json;charset=utf-8');
    return new Response(outBody, {
      status: status,
      statusText: status == 200 ? 'OK' : 'FUCK',
      headers: outHeaders
    })
  }
  
  // 新增：创建引导页面
  function createLandingPage(request) {
    const html = `
    <!DOCTYPE html>
    <html lang="zh-cn">
    <head>
        <title>🐱‍🏍Proxy All</title>
        <style>
        *{margin:0;padding:0;}h1{margin-top:10px;text-align:center;}#app{width:700px;height:fit-content;margin:10px auto;border-radius:6px;padding:20px;box-shadow:0 0 3px 2px rgb(230,230,230);}.top{display:flex;justify-content:space-between;border:1px solid gray;padding:4px 2px;border-radius:5px;align-items:center;margin:0 0 10px;}.top input{height:30px;font-size:18px;border:none;outline:none;margin-left:5px;flex:1;color:rgb(40,40,40);}.top span{font-size:18px;color:black;}.top select{height:30px;width:70px;border:none;outline:none;}.top button{border:none;outline:none;border-left:1px solid lightgray;background-color:transparent;cursor:pointer;padding:5px 10px;}.top button:hover{background-color:lightgray;}.tabs{margin:10px 0;width:100%;}.tabs-title{display:flex;margin-bottom:10px;}.tab-header{padding:4px 10px;cursor:pointer;border:1px solid lightgray;border-left:1px solid lightgray;}.tab-header:last-of-type{}.tab-header.active{box-sizing:border-box;border-bottom:2px solid orange;}.tab-header:hover{background-color:#62C0F0;}.tab-body{}.tab-table{border:1px solid gray;border-radius:5px;}table tr{display:flex;}.row{display:flex;justify-content:space-evenly;border-bottom:1px solid lightgray;height:30px;line-height:30px;}.row:last-of-type{border-bottom:none;}.cell{width:25%;border-right:1px solid lightgray;box-sizing:border-box;}.cell:last-of-type{border-right:none;}.cell.l{width:33%;}.cell.m{width:24%;}.cell.s{width:18%;}.cell input{border:none;outline:none;width:100%;font-size:16px;}.body-text{width:100%;height:300px;resize:none;font-size:17px;box-sizing:border-box;padding:10px;}
        </style>
        <script src="https://cdn.bootcdn.net/ajax/libs/vue/2.6.0/vue.min.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    </head>
    <body>
        <h1>Proxy All</h1>
        <div id="app">
            <div class="top">
                <select id="method" v-model="method">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
                <span v-text="location.origin + '/'"></span>
                <input v-model="url" type="text" 
                    @keydown.enter="send"
                    :placeholder="'https://your.proxy.url/xxx'"/>
                <button @click="send" :disabled="lock">Send</button>
            </div>
            <div>目标URL: <a :href="targetUrl" target="_blank" style="word-break: break-all;">{{this.targetUrl}}</a></div>
            <div class="tabs">
                <div class="tabs-title">
                    <div :class="{'tab-header':true, 'active':active==1}" @click="active=1">Headers</div>
                    <div :class="{'tab-header':true, 'active':active==2}" @click="active=2">Body</div>
                    <div :class="{'tab-header':true, 'active':active==3}" @click="active=3">Code</div>
                    <div class="tab-header" style="padding: 0;">
                        <select v-if="active==2" 
                            v-model="bodyType" style="border: none;outline: none;height: 100%;width: 80px;"
                            >
                            <option value="text">text</option>
                            <option value="form-data">form-data</option>
                            <option value="x-www-form-urlencoded">x-www-form-urlencoded</option>
                        </select>
                    </div>
                </div>
                <!-- Header -->
                <div class="tab-body" v-show="active==1">
                    <div class="tab-table">
                        <div class="row">
                            <div class="cell l">key</div>
                            <div class="cell l">value</div>
                            <div class="cell s">option</div>
                        </div>
                        <div v-for="(header, i) in headers" class="row">
                            <div class="cell l">
                                <input v-model="header.key" type="text"/>
                            </div>
                            <div class="cell l">
                                <input v-model="header.value" type="text"/>
                            </div>
                            <div class="cell s">
                                <a href="javascript:;" @click="deleteRow(i, 'header')">Remove</a>
                            </div>
                        </div>
                    </div>
                    <a href="javascript:;" @click="appendRow('header')">Add</a>
                </div>
                <!-- Body -->
                <div class="tab-body" v-show="active==2">
                    <div v-show="bodyType=='text'">
                        <textarea class="body-text" v-model="body.text"></textarea>
                    </div>
                    <div v-show="bodyType=='form-data'">
                        <div class="tab-table">
                            <div class="row">
                                <div class="cell m">key</div>
                                <div class="cell m">value</div>
                                <div class="cell m">type</div>
                                <div class="cell m">option</div>
                            </div>
                            <div v-for="(item, i) in body['form-data']" class="row">
                                <div class="cell m">
                                    <input v-model="item.key" type="text"/>
                                </div>
                                <div class="cell m">
                                    <input v-model="item.value" type="text"/>
                                </div>
                                <div class="cell m">
                                    <select v-model="item.type">
                                        <option value="text">text</option>
                                        <option value="file" disabled title="NOT IMPLEMENTED">file</option>
                                    </select>
                                </div>
                                <div class="cell m">
                                    <a href="javascript:;" @click="deleteRow(i, 'body')">Remove</a>
                                </div>
                            </div>
                        </div>
                        <a href="javascript:;" @click="appendRow('body')">Add</a>
                    </div>
                    <div v-show="bodyType=='x-www-form-urlencoded'">
                        <div class="tab-table">
                            <div class="row">
                                <div class="cell l">key</div>
                                <div class="cell l">value</div>
                                <div class="cell s">option</div>
                            </div>
                            <div v-for="(item, i) in body['x-www-form-urlencoded']" class="row">
                                <div class="cell l">
                                    <input v-model="item.key" type="text"/>
                                </div>
                                <div class="cell l">
                                    <input v-model="item.value" type="text"/>
                                </div>
                                <div class="cell s">
                                    <a href="javascript:;" @click="deleteRow(i, 'body')">Remove</a>
                                </div>
                            </div>
                        </div>
                        <a href="javascript:;" @click="appendRow('body')">Add</a>
                    </div>
                </div>
                <!-- Code -->
                <div class="tab-body" v-show="active==3">
                    <button @click="copyModifyHeaders">复制header</button>
                </div>
            </div>
            <div v-show="resp1 || resp2">
                <h2>Response:</h2>
                <div v-show="resp1">
                    <h4 v-text="url"></h4>
                    <pre> 
                        <code id="resp1" v-text="resp1"></code>
                    </pre>
                </div>
                <div v-show="resp2">
                    <h4 v-text="targetUrl"></h4>
                    <pre>
                        <code id="resp2" v-text="resp2"></code>
                    </pre>
                </div>
            </div>
        </div>
        <script>
            const URL_REGEX = /(https?:\\/\\/[^/]+)\\/?/;
            new Vue({
                el: '#app',
                data: {
                    lock: false,
                    active: 1,
                    method: 'GET',
                    url: '',
                    headers: null,
                    body: null,
                    bodyType: 'text',
                    codeType: 'xhr',
                    resp1: null,
                    resp1Lang: '',
                    resp2: null,
                    resp2Lang: '',
                    modifyHeaders: {}
                },
                computed: {
                    targetUrl() {
                        return location.origin + '/' + this.url
                    },
                },
                mounted() {
                    this.url = 'https://api.openai.com/v1/chat/completions'
                    this.body = {
                        'text': '',
                        'form-data': [{ key: '', value: '', type: 'text' }],
                        'x-www-form-urlencoded': [{ key: '', value: '' }],
                    }
                    this.headers = [{ key: '', value: '' }]
                },
                methods: {
                    send() {
                        if (this.lock) {
                            return;
                        }
                        if (!this.url || !URL_REGEX.test(this.url)) {
                            return alert("Url is empty!");
                        }
                        try {
                            this.checkKeyAndValue(this.headers, 'header');
                            if (this.method != 'GET' && this.bodyType != 'text') {
                                this.checkKeyAndValue(this.body[this.bodyType], 'body');
                            }
                        } catch(err) {
                            return alert(err.message);
                        }
                        this.lock = true;
                        this.resp1 = this.resp2 = '';
                        if (this.method == 'GET') {
                            this.sendGet(this.url, false);
                            this.sendGet(this.targetUrl, true);
                        } else {
                            this.sendOther(this.url, false);
                            this.sendOther(this.targetUrl, true);
                        }
                    },
                    sendGet(url, proxy) {
                        console.log("发送GET " + url);
                        fetch(url, {
                            method: this.method,
                            headers: {
                                modifyheaders: JSON.stringify(this.modifyHeaders)
                            }
                        })
                            .then(response => {
                                this.checkLanguage(response, proxy);
                                return response.text();
                            })
                            .then(data => {
                                console.log({
                                    "url": url,
                                    "lang": proxy ? this.resp2Lang : this.resp1Lang, 
                                    "data": data,
                                })
                                this.handleResponse(data, proxy);
                            })
                            .catch(error => {
                                console.error(error);
                                console.log({
                                    "url": url,
                                    "lang": proxy ? this.resp2Lang : this.resp1Lang, 
                                    "data": error,
                                })
                                this.handleResponse('Error: ' + error, proxy);
                            });
                    },
                    sendOther(url, proxy) {
                        console.log(\`发送\${this.method} \` + url);
                        let contentType = null;
                        let body = null;
                        if (this.bodyType == 'text') {
                            contentType = 'application/json';
                            body = this.body.text;
                        } else if (this.bodyType == 'form-data') {
                            contentType = 'multipart/form-data';
                            body = new FormData();
                            this.body[this.bodyType].forEach(item => {
                                if (item.key && item.value)
                                    body.append(item.key, item.value);
                            })
                        } else { // x-www-....urlencoded
                            contentType = 'application/x-www-form-urlencoded';
                            body = {};
                            this.body['form-data'].forEach(item => {
                                if (item.key && item.value)
                                    body[item.key] = item.value;
                            })
                            body = new URLSearchParams(body).toString();
                        }
                        console.log("body is:", body);
                        const headers = {
                            modifyHeaders: JSON.stringify(this.modifyHeaders)
                        }
                        if (this.bodyType != 'form-data') { // form-data不能手动指定ContentType为multipart/form-data 我晕
                            headers['Content-Type'] = contentType;
                        }
                        fetch(url, {
                            method: this.method,
                            headers: headers,
                            body: body
                        })
                            .then(response => {
                                this.checkLanguage(response, proxy);
                                return response.text();
                            })
                            .then(data => {
                                console.log({
                                    "url": url,
                                    "lang": proxy ? this.resp2Lang : this.resp1Lang, 
                                    "data": data,
                                })
                                this.handleResponse(data, proxy);
                            })
                            .catch(error => {
                                console.error(error);
                                console.log({
                                    "url": url,
                                    "lang": proxy ? this.resp2Lang : this.resp1Lang, 
                                    "data": error,
                                })
                                this.handleResponse('(Press F12 for details) Error: ' + error, proxy);
                            });
                    },
                    checkKeyAndValue(items, name) {
                        if (name == 'header') {
                            this.modifyHeaders = {};
                        }
                        for (let i = 0; i < items.length; i++) {
                            const item = items[i];
                            if (!item.key && !item.value) {
                                continue;
                            } else if (!item.key) {
                                throw Error(\`\${name}: No.\${i+1} row's key is empty!\`);
                            } else if (!item.value) {
                                throw Error(\`\${name}: No.\${i+1} row's value is empty!\`);
                            } else {
                                if (name == 'header')
                                    this.modifyHeaders[item.key] = item.value;
                            }
                        }
                    },
                    checkLanguage(response, proxy) {
                        const contentType = response.headers.get("content-type");
                        let language = ''
                        if (contentType.includes('json')) {
                            language = 'json';
                        } else if (contentType.includes('html')) {
                            language = 'html';
                        }
                        if (proxy) {
                            this.resp2Lang = language;
                        } else {
                            this.resp1Lang = language;
                        }
                    },
                    handleResponse(data, proxy) {
                        const elem = proxy ? document.getElementById('resp2') : document.getElementById('resp1');
                        if (proxy) {
                            this.resp2 = data;
                            elem.removeAttribute('data-highlighted');
                            elem.className = this.resp2Lang;
                            hljs.highlightElement(elem);
                            if (this.resp1) {
                                this.lock = false;
                            }
                        } else {
                            this.resp1 = data;
                            elem.removeAttribute('data-highlighted');
                            elem.className = this.resp1Lang;
                            hljs.highlightElement(elem);
                            if (this.resp2) {
                                this.lock = false;
                            }
                        }
                    },
                    deleteRow(i, type) {
                        if (type == 'header') {
                            this.headers.splice(i, 1);
                        } else if (type == 'body') {
                            this.body[this.bodyType].splice(i, 1);
                        }
                    },
                    appendRow(type) {
                        if (type == 'header') {
                            this.headers.push({key: '', value: ''});
                        } else {
                            if (this.bodyType == 'form-data') {
                                this.body[this.bodyType].push({key: '', value: '', type: 'text'})
                            } else {
                                this.body[this.bodyType].push({key: '', value: ''})
                            }
                        }
                    },
                    copyModifyHeaders() {
                        try {
                            this.checkKeyAndValue(this.headers, 'header');
                            alert(\`modifyheaders: \${JSON.stringify(this.modifyHeaders)}\`)
                        } catch(e) {
                            alert(e.message);
                        }
                    }
                }
            })
            function sendRequest() {
                const url = document.getElementById('url').value;
                const method = document.getElementById('method').value;
                const body = document.getElementById('body').value;
    
                fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: body
                })
                    .then(response => response.text())
                    .then(data => {
                        document.getElementById('response').innerText = data;
                    })
                    .catch(error => {
                        document.getElementById('response').innerText = 'Error: ' + error;
                    });
            }
        </script>
    </body>
    </html>
    `;
  
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    });
  }