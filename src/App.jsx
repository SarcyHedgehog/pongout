// src/App.jsx
import React from 'react';
import Game from './Game'; // Import the Game component
import './index.css'; // Import global styles (Vite default is index.css)

function App() {
  return (
    // The Game component now contains all the logic
    <Game />
  );
}

export default App;