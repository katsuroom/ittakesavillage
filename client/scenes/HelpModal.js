export class HelpModal {
    constructor() {
        this.isVisible = false;
        this.content = `# It Takes a Village - Help Document

## Introduction
Welcome to "It Takes a Village"! This cooperative game challenges you and your fellow players to work together to build and manage a thriving village. Your goal is to upgrade all facilities to their maximum level while keeping your villagers happy and healthy.

## How to Play

### Roles
Each player takes on one of six roles, each with unique abilities:
- Chief: Can assign villagers to facilities
- Doctor: Can heal sick villagers and make them immune
- Scientist: Unlocks apple trees and predicts future events
- Sociologist: Can view villager happiness and remove least favorite tasks
- Farmer: Plants crops faster and can fertilize farmland
- Engineer: Can upgrade materials and convert bricks to steel

### Game Flow
1. The game progresses in turns, with each player taking actions on their turn.
2. Each turn represents one day in the village.
3. At the end of each day, various updates occur (villager status, crop growth, etc.).
4. Events occur periodically, affecting the village positively or negatively.

### Main Actions
- Assign villagers to facilities
- Plant and harvest crops
- Use materials to upgrade facilities
- Heal sick villagers
- Use your role's special ability

### Resources
- Budget: Used to purchase items from the shop
- Crops: Used to feed villagers
- Materials: Used to upgrade facilities

## How to Win
To win the game, you must upgrade all four main facilities (Water, Farming, Education, and Housing) to level 5. This requires careful resource management, strategic planning, and cooperation among all players.

## Key Strategies
1. Keep villagers fed and healthy to maintain high happiness levels.
2. Efficiently assign villagers to facilities based on their preferences and skills.
3. Manage your resources carefully, balancing between immediate needs and long-term goals.
4. Use each player's unique abilities to overcome challenges and optimize village growth.
5. Prepare for and mitigate the effects of negative events.

## Tips
- The Chief's ability to assign villagers is crucial for efficient resource generation.
- The Doctor's healing abilities can save you from losing villagers to sickness.
- The Scientist's event prediction can help you prepare for upcoming challenges.
- The Sociologist can help optimize villager happiness and productivity.
- The Farmer's abilities are vital for maintaining a steady food supply.
- The Engineer's material upgrades can significantly speed up facility improvements.

Remember, communication and cooperation between all players are key to success in "It Takes a Village"!`;
        this.scrollOffset = 0;
        this.lineHeight = 20;
        
        // Bind the event handlers to maintain correct 'this' context
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleScroll = this.handleScroll.bind(this);
    }

    show() {
        this.isVisible = true;
        this.scrollOffset = 0;
        // Add event listeners when showing the modal
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('click', this.boundHandleClick);
            canvas.addEventListener('wheel', this.boundHandleScroll);
        }
    }

    hide() {
        this.isVisible = false;
        // Remove event listeners when hiding the modal
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.removeEventListener('click', this.boundHandleClick);
            canvas.removeEventListener('wheel', this.boundHandleScroll);
        }
    }

    draw(ctx) {
        if (!this.isVisible) return;

        // Draw a semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw the modal
        const modalWidth = ctx.canvas.width * 0.8;
        const modalHeight = ctx.canvas.height * 0.8;
        const modalX = (ctx.canvas.width - modalWidth) / 2;
        const modalY = (ctx.canvas.height - modalHeight) / 2;

        ctx.fillStyle = 'white';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);

        // Create a clipping region for the content
        ctx.save();
        ctx.beginPath();
        ctx.rect(modalX + 20, modalY + 20, modalWidth - 40, modalHeight - 40);
        ctx.clip();

        // Draw the content
        ctx.font = '16px Arial';
        ctx.fillStyle = 'black';
        this.drawText(ctx, this.content, modalX + 20, modalY + 20 - this.scrollOffset, modalWidth - 40, modalHeight - 40);

        ctx.restore();

        // Draw close button
        ctx.fillStyle = 'red';
        ctx.fillRect(modalX + modalWidth - 40, modalY + 10, 30, 30);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('X', modalX + modalWidth - 30, modalY + 30);

        // Draw scroll indicators
        if (this.scrollOffset > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.moveTo(modalX + modalWidth / 2, modalY + 10);
            ctx.lineTo(modalX + modalWidth / 2 - 10, modalY + 30);
            ctx.lineTo(modalX + modalWidth / 2 + 10, modalY + 30);
            ctx.fill();
        }

        if (this.scrollOffset < this.maxScroll) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.moveTo(modalX + modalWidth / 2, modalY + modalHeight - 10);
            ctx.lineTo(modalX + modalWidth / 2 - 10, modalY + modalHeight - 30);
            ctx.lineTo(modalX + modalWidth / 2 + 10, modalY + modalHeight - 30);
            ctx.fill();
        }
    }

    drawText(ctx, text, x, y, maxWidth, maxHeight) {
        const lines = text.split('\n');
        let currentY = y;
        this.maxScroll = 0;

        lines.forEach(line => {
            if (line.startsWith('#')) {
                ctx.font = 'bold 20px Arial';
                this.lineHeight = 30;
            } else if (line.startsWith('##')) {
                ctx.font = 'bold 18px Arial';
                this.lineHeight = 25;
            } else {
                ctx.font = '16px Arial';
                this.lineHeight = 20;
            }

            const words = line.split(' ');
            let currentLine = '';

            words.forEach(word => {
                const testLine = currentLine + word + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;

                if (testWidth > maxWidth && currentLine !== '') {
                    ctx.fillText(currentLine, x, currentY);
                    currentLine = word + ' ';
                    currentY += this.lineHeight;
                    this.maxScroll = Math.max(this.maxScroll, currentY - y - maxHeight);
                } else {
                    currentLine = testLine;
                }
            });

            ctx.fillText(currentLine, x, currentY);
            currentY += this.lineHeight;
            this.maxScroll = Math.max(this.maxScroll, currentY - y - maxHeight);
        });
    }

    handleClick(e) {
        // Get the canvas and its bounding rectangle
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate the actual position within the canvas
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Convert client coordinates to canvas coordinates
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;

        // Calculate modal dimensions
        const modalWidth = canvas.width * 0.8;
        const modalHeight = canvas.height * 0.8;
        const modalX = (canvas.width - modalWidth) / 2;
        const modalY = (canvas.height - modalHeight) / 2;

        // Check if click is within close button bounds
        if (
            canvasX > modalX + modalWidth - 40 &&
            canvasX < modalX + modalWidth - 10 &&
            canvasY > modalY + 10 &&
            canvasY < modalY + 40
        ) {
            this.hide();
        }
    }

    handleScroll(e) {
        e.preventDefault();
        this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset + e.deltaY));
    }
}