export class Animation {

    constructor(frames, delay)     // frames: array of images, delay: duration of frame
    {
        this.frames = frames;

        this.numFrames = frames.length;
        this.currentFrame = 0;

        this.delay = delay;
        this.tick = 0;
    }

    getFrame()
    {
        this.tick++;

        if(this.tick == this.delay)
        {
            this.tick = 0;
            this.currentFrame = (this.currentFrame + 1) % this.numFrames;
        }

        return this.frames[this.currentFrame];
    }
}