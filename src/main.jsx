// src/main.jsx
import './index.css';                    // Tailwind v4 entry (must be first)
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

// If you created ErrorBoundary.jsx, you can wrap <App/> with it.
// import ErrorBoundary from './ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* <ErrorBoundary> */}
        <App />
      {/* </ErrorBoundary> */}
    </BrowserRouter>
  </React.StrictMode>
);
