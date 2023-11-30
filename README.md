# It Takes a Village

## About

It Takes a Village is a collaborative multiplayer game designed and developed for the Innovative Instructional Technology Grant. The game is written in JavaScript using HTML Canvas, along with:
- **Node.js**: Runtime environment.
- **Express**: Backend server.
- **Socket.IO**: For sending messages between the client and server.

## How to Run

To run the game locally, please ensure that you have Node.js installed.  
Then navigate to the root of the repository and run the following commands:

`cd server`  
`npm install`  
`npm start`

The game will run in the browser at `localhost:8000`.

## Project Structure

The project is divided into two main folders:
- `client`
    - Contains the static HTML page.
    - Game assets (images, audio, and fonts).
    - Logic for player input and client-side rendering.
- `server`
    - Contains code for setting up the backend server.
    - Logic for creating and maintaining active games, contains the majority of game logic.
    - Communicates messages between clients.

The `map` folder contains maps and tilesheets for designing the game layout, and includes project files for the Tiled map editor. The contents in this folder are used for development only and are not loaded when the game is running.

Documentation for `client` and `server` are available in the wiki tab.