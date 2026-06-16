import React, { useState } from 'react';
import './BevaCard.css';
import Chatbot from './chatbot';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../firebase';

const BevaCard = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showChatForm, setShowChatForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showCard, setShowCard] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [chatbotContent, setChatbotContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  const handleImageClick = () => {
    console.log("Image clicked!");
    setShowOverlay(true);
    setShowCard(true);
  };

  const handleOverlayClick = () => {
    handleCloseClick();
  };

  const handleCloseClick = () => {
    setShowOverlay(false);
    setShowChatForm(false);
    setShowCard(true);
    setIsConnected(false);
    setName('');
    setEmail('');
    setPhone('');
    setUserQuestion('');
    setGreetingMessage('');
    setChatbotContent(null);
  };

  const handleStartChatClick = () => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setShowChatForm(true);
    }, 900);
  };

  const handleConnectClick = async () => {
    if (name.length <= 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{10,12}$/.test(phone)) {
      alert('Harap isi formulir dengan benar.');
      return;
    }

    try {
      const db = getFirestore(app);
      const userData = {
        name,
        email,
        phone,
        terakhirLogin: serverTimestamp()
      };

      const usersCollection = collection(db, 'users');
      const userRef = await addDoc(usersCollection, userData);

      console.log('Data saved successfully:', userRef.id);

      if (!greetingMessage) {
        setGreetingMessage(`Selamat datang, ${name}! Bagaimana saya bisa membantu Anda?`);
      }

      setChatbotContent(<Chatbot name={name} />);
      setIsConnected(true);
    } catch (error) {
      console.error('Terjadi kesalahan:', error.message);
    }
  };

  return (
    <div className={`beva-card ${showCard ? '' : ''}`}>
      {isLoading && (
        <div className="loading-overlay">
          <img src="/bevaicon.png" alt="Loading..." className="loading-image" />
        </div>
      )}
      {showOverlay && (
        <div className="overlay-card" onClick={handleOverlayClick}></div>
      )}
      {showOverlay ? (
        showChatForm ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {chatbotContent || (
              <React.Fragment>
                <img
                  src="/close.png"
                  alt="Close"
                  className="close-icon"
                  onClick={handleCloseClick}
                />
                <img
                  src="/bevaicon.png"
                  alt="Card Image"
                  className="card-image2"
                />
                <p style={{ textAlign: 'center', fontFamily: 'Neo Sans Std Regular', color: 'black', fontSize: '12px', marginTop: '25px' }}>
                  Hai, beva siap membantu kamu
                  <br />
                  Silahkan masukkan data diri kamu untuk terhubung dengan beva!
                </p>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Nama"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p className="input-description">
                    {name.length <= 3 && name.length > 0
                      ? "Nama harus memiliki lebih dari 3 karakter."
                      : ""}
                  </p>
                </div>

                <div className="form-group">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="input-description">
                    {!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length > 0
                      ? "Email tidak valid."
                      : ""}
                  </p>
                </div>

                <div className="form-group">
                  <input
                    type="tel"
                    placeholder="Nomor Telepon"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="input-description">
                    {(!/^\d{10,12}$/.test(phone) && phone.length > 0)
                      ? "Panjang harus antara 10-12 karakter."
                      : ""}
                  </p>
                </div>

                <button
                  onClick={handleConnectClick}
                  className="connect-button"
                >
                  Connect
                </button>
                {greetingMessage && (
                  <p>{greetingMessage}</p>
                )}
                <p>{userQuestion}</p>
              </React.Fragment>
            )}
          </div>
        ) : (
          isConnected ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {chatbotContent}
              <img
                src="/close.png"
                alt="Close"
                className="close-icon"
                onClick={handleCloseClick}
              />
              <img
                src="/bevaicon.png"
                alt="Card Image"
                className="card-image2"
              />
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img
                src="/bevaicon.png"
                alt="Card Image"
                className="card-image1"
              />
              <p style={{ color: 'black', fontWeight: 'bold', marginTop: '25px', marginBottom:'-10px'}}>
                Selamat datang!
              </p>
              <p style={{ textAlign: 'center', fontFamily: 'Neo Sans Std Regular', color: 'black', fontSize: '13px', marginBottom: '0px' }}>
                Kami siap membantu, silahkan mulai layanan chat
              </p>
              <button
                onClick={handleStartChatClick}
                className="connect-button"
              >
                Mulai Chat
              </button>
            </div>
          )
        )
      ) : (
        <div className="card-content">
          <img
            src="/bevaicon.png"
            alt=""
            className="card-image"
            onClick={handleImageClick}
          />
          <div className="card-title">berijalan Assistant</div>
        </div>
      )}
    </div>
  );
};

export default BevaCard;
