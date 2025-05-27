function Landing() {

    return (
        <>
            <div className="d-flex flex-column align-items-center justify-content-center vh-100 text-center">
                <h1 className="mb-4 display-1">Create and Share Your Digital <br />Busienss Card</h1>
                <p className="mb-4">Your one-stop solution for QR code generation and VCard management.</p>
                <div className="d-flex gap-3">
                    <a href="/url-to-qr" className="btn btn-primary">Generate QR Code</a>
                    <a href="/vcard-gen" className="btn btn-secondary">Create VCard</a>
                </div>
            </div>
            <footer className="text-center mt-5 p-3 bg-light border-top">
                @2025 vpatel.au. All rights reserved.
            </footer>
        </>
    );
}

export default Landing;
