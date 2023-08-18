export class Animation {

    constructor(frames, duration)     // frames: array of images, delay: duration of frame
    {
        this.frames = frames;

        this.numFrames = frames.length;
        this.currentFrame = 0;

        this.duration = duration;
        this.tick = 0;
    }

    getFrame()
    {
        this.tick++;

        if(this.tick == this.duration)
        {
            this.tick = 0;
            this.currentFrame = (this.currentFrame + 1) % this.numFrames;
        }

        return this.frames[this.currentFrame];
    }
}