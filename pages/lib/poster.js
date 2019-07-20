
class Sprite {
  constructor(config) {
    this.x = config.x
    this.y = config.y
    this.width = config.width
    this.height = config.height
  }
}

class Image extends Sprite {
  constructor (config) {
    super(config)
    this.src = config.src
    this.radius = config.radius
  }

  async draw(ctx) {
    ctx.save()
    let src = await downImg(this.src)
    if (this.radius === '50%') {
      this.r = this.width / 2
      ctx.beginPath()
      ctx.arc(this.x + this.r, this.y + this.r, this.r, 0, 2*Math.PI)
      ctx.clip()
    }
    ctx.drawImage(src, this.x, this.y, this.width, this.height)
    ctx.restore()
  }
}


class Text extends Sprite {
  constructor (config) {
    super(config)
    this.text = config.text
    this.color = config.color
    this.font = config.font || '12px sans-'
    this.width = config.width
    this.fontSize = +this.font.match(/\d+/)[0]
  }

  async draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.font = this.font
    // 判断是否需要折行
    if (this.width) {
      let len = Math.floor(this.width / this.fontSize)
      let row = Math.ceil(this.width / len)
      if (row === 1) {
        ctx.fillText(this.text, this.x, this.y + this.fontSize);
      } else {
        let arr = []
        for (let i = 0; i < row; i++) {
          arr.push(this.text.substr(i * len, len))
        }
        arr.forEach((str, i) => ctx.fillText(str, this.x, this.y + this.fontSize * (i + 1) * 1.2))
      }

    } else {
      ctx.fillText(this.text, this.x, this.y + this.fontSize);
    }

    ctx.restore();
  }
}
// 下载图片
function downImg(url) {
  if (/wxfile\:\/\//.test(url)) {
    return cache[url]
  }
  if (cache[url]) {
    return cache[url]
  }
  return new Promise(function(resolve, reject) {
    wx.downloadFile({
      url: url,
      success: (res)=>{
        resolve(res.tempFilePath)
        cache[url] = res.tempFilePath
      },
      fail: ()=>{
        reject(err)
      }
    });
  })
}
// 图片临时地址缓存
const cache = {}

class Poster {
  constructor({width, height, scale, canvasId}) {
    if (canvasId) {
      throw new Error('请传入canvasId')
    }
    this.width = width
    this.height = height
    this.scale = scale || 1
    this.canvasId = canvasId
    this.ctx = wx.createCanvasContext(canvasId);
  }
  async draw(steps) {
    let ctx = this.ctx
    ctx.scale(this.scale, this.scale)
    let omTree = []
    const typeMap = {
      img: Image,
      text: Text
    }
    for (let i = 0, len = steps.length; i < len; i++) {
      let sprite = steps[i];
      // 解析简单的表达式
      if (i > 0 && /^\+\d+$/.test(sprite.x)) {
        sprite.x = steps[i - 1].x + Number(sprite.x.slice(1))
      }

      if (i > 0 && /^\+\d+$/.test(sprite.y)) {
        sprite.y = steps[i - 1].y + Number(sprite.y.slice(1))
      }

      omTree.push(new typeMap[sprite.type](sprite))
    }

    for (let om of omTree) {
      await om.draw(ctx)
    }
    return new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          x: 0,
          y: 0,
          width: this.width * this.scale,
          height: this.height * this.scale,
          canvasId: this.canvasId,
          quality: 0.8,
          success(res) {
            console.log(res)
            resolve(res.tempFilePath)
          },
          fail(err) {
            reject(err)
          }
        })
      })
    })

  }
  clear() {
    this.ctx.scale(1, 1);
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.draw();
  }
}

export default Poster