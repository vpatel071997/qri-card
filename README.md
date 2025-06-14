<h1 align="center">
 QriCard.
</h1>

<h3 align="center">Qri Card - Simple solution to generate and download QR codes for any URL for FREE.</h3>

<p align="center">

 <img alt="Status" src="https://img.shields.io/badge/status-In Production-green">

  <img alt="Latest Version" src="https://img.shields.io/badge/latest version-1.1.0-2e7f74">
  
  <img alt="License" src="https://img.shields.io/badge/license-MIT-d52536">

  <a href="https://github.com/vpatel071997">
    <img alt="made by Vaibhav Patel" src="https://img.shields.io/badge/made%20by-Vaibhav%20Patel-116ed0">
  </a>
</p>

## Features

- QR Code Generation:
  - Enter URL and generate downloable QR code as a PNG image
- VCard Generation:
  - Enter details in the given fields and export QR code as a PNG image
  - Allowing viewer to `Add to Contacts` on a single tap from VCard.

## Live Access: [Click Me](https://qri-card.vercel.app)

## Development/Contribution - Getting Started

### Prerequisites

- Node.js (v20 or newer recommended)
- npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/qri-card.git
   cd qri-card
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

#### In web

```bash
npm start
```

#### As Desktop App

```bash
npm run electron:dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

---

### Build the Docker image

```bash
docker build -t qri-card .
```

### Run the Docker container

```bash
docker run -p 3000:80 qri-card
```

---

### Build Desktop release

```bash
npm run electron:dist
```

## Project Structure

```
src/
  App.tsx         # Main app component
  App.test.tsx    # Tests
  index.tsx       # Entry point
  ...
```

## Technologies Used

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [React Bootstrap](https://react-bootstrap.github.io/)
- [react-qr-code](https://github.com/rosskhanas/react-qr-code)
- [html-to-image](https://github.com/bubkoo/html-to-image)
- [Powered By Vercel](http://vercel.com)
