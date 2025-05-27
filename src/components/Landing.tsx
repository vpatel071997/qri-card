import { motion } from "framer-motion";
import { Button } from "react-bootstrap";

function QrBackground() {
  const gridSize = 100;
  const squares = [];
  const fillProbability = 0.2; // Adjust for more/less density

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      // Only render a box at random positions
      if (Math.random() < fillProbability) {
        const delay = Math.random() * 2;
        squares.push(
          <motion.div
            key={`${x}-${y}`}
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              delay,
            }}
            style={{
              width: 18,
              height: 18,
              background: "#222",
              borderRadius: 3,
              margin: 2,
              gridColumn: x + 1,
              gridRow: y + 1,
            }}
          />,
        );
      }
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        zIndex: -1,
        display: "grid",
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        pointerEvents: "none",
        opacity: 0.05,
      }}
    >
      {squares}
    </div>
  );
}

function Landing() {
  return (
    <>
      <div style={{ overflow: "hidden", position: "relative" }}>
        <QrBackground />
        <div
          className="d-flex flex-column align-items-center justify-content-center text-center"
          style={{ position: "relative", zIndex: 1, height: "80vh" }}
        >
          <h1 className="mb-4 display-1">
            Create and Share Your Digital <br />
            Busienss Card
          </h1>
          <p className="mb-4">
            Your one-stop solution for QR code generation and VCard management.
          </p>
          <div className="d-flex gap-3">
            <Button
              href="/url-to-qr"
              variant="primary"
              className="shadow p-3 mb-5 rounded"
            >
              Generate QR Code
            </Button>
            <Button
              href="/vcard-gen"
              variant="secondary"
              className="shadow p-3 mb-5 rounded"
            >
              Create VCard
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Landing;
