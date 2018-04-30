export default class Notif {
  constructor(text, maxSize, growTime = 80, holdTime = 768) {
    this.text = text
    this.maxSize = maxSize
    this.growTime = growTime
    this.holdTime = holdTime
    this.animDuration = growTime * 2 + holdTime
    this.size = 0
    this.time = 0
    this.finished = false
  }


  update(frameTime) {
    this.time += frameTime

    if (this.time < this.growTime) { //grow
      this.size = Math.floor((this.time / this.growTime) * this.maxSize)
    }
    else if (this.time < this.growTime + this.holdTime) { //hold
      this.size = this.maxSize
    }
    else if (this.time < this.animDuration) { //shrink
      const time = this.time - (this.growTime + this.holdTime)

      this.size = this.maxSize - Math.floor(time / this.growTime * this.maxSize)
    }
    else {
      this.finished = true
    }
  }
  
}