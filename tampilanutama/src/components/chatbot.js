import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './BevaCard.css';
import ChatbotHeader from './ChatbotHeader';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../firebase';


const Chatbot = ({ name }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [greetingSet, setGreetingSet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(true);
  const [askBeva, setAskBeva] = useState(false);
  const [showAskBevaButton, setShowAskBevaButton] = useState(true);
  const [idleTimeout, setIdleTimeout] = useState(null);
  const [showIdleMessage, setShowIdleMessage] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [chatRecommendations, setChatRecommendations] = useState([]);
  const [receivedRecommendations, setReceivedRecommendations] = useState([]);
  const [followUpIntents, setFollowUpIntents] = useState([]);
  const [followUpVisible, setFollowUpVisible] = useState(true);
  
  const messagesRef = useRef(null);
  const btnCardsRef = useRef(null);
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const usersCollection = collection(db, 'users'); // Ganti 'users' dengan nama koleksi yang sesuai

  const [star1Lit, setStar1Lit] = useState(false);
  const [star2Lit, setStar2Lit] = useState(false);
  const [star3Lit, setStar3Lit] = useState(false);
  const [star4Lit, setStar4Lit] = useState(false);
  const [star5Lit, setStar5Lit] = useState(false);

  const handleStarClick = (starNumber) => {
    setStar1Lit(starNumber >= 1);
    setStar2Lit(starNumber >= 2);
    setStar3Lit(starNumber >= 3);
    setStar4Lit(starNumber >= 4);
    setStar5Lit(starNumber === 5);
    setStarRating(starNumber); // Set starRating sesuai dengan bintang yang diklik
  };
  
  
  
  useEffect(() => {
    const feedbackTimeout = setTimeout(() => {
      setShowFeedbackPopup(true);
    }, 1 * 60 *4000); // 2 menit

    return () => {
      clearTimeout(feedbackTimeout);
    };
  }, []);

  const closeFeedbackPopup = () => {
    setShowFeedbackPopup(false);
  };
  const submitFeedback = async () => {
    try {
      // Lakukan sesuatu dengan rating
      console.log(`Feedback submitted: Rating - ${starRating}`);
  
      // Menentukan keterangan berdasarkan nilai rating
      let feedbackDescription = '';
      switch (starRating) {
        case 1:
          feedbackDescription = 'Tidak membantu';
          break;
        case 2:
          feedbackDescription = 'Kurang membantu';
          break;
        case 3:
          feedbackDescription = 'Cukup membantu';
          break;
        case 4:
          feedbackDescription = 'Membantu';
          break;
        case 5:
          feedbackDescription = 'Sangat membantu';
          break;
        default:
          feedbackDescription = '';
      }
  
      // Dapatkan DocumentID dari user dengan nama yang sesuai
      const userQuery = query(usersCollection, where('name', '==', name));
      const userQuerySnapshot = await getDocs(userQuery);
  
      if (userQuerySnapshot.empty) {
        console.error('User not found');
        return;
      }
  
      const userId = userQuerySnapshot.docs[0].id;
  
      const ratingsCollection = collection(db, 'ratings');
  
      // Tambahkan rating ke Firestore bersama dengan keterangan
      await addDoc(ratingsCollection, {
        userId: userId,
        rating: starRating,
        description: feedbackDescription,
        timestamp: serverTimestamp(),
      });
  
      // Setelah submit, tutup popup dan reset timeout jika diperlukan
      closeFeedbackPopup();
      resetIdleTimeout();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };
  
  
  const handleRecommendationClick = (recommendationText) => {
    setInputMessage(recommendationText); // Set input pada antarmuka pengguna dengan rekomendasi yang dipilih
    handleSendMessage(recommendationText);
    setFollowUpVisible(false); // Sembunyikan follow-up intents setelah salah satu diklik
  };
  ;

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const addMessage = (text, isUser = false, isTypingIndicator = false, isRecommendation = false) => {
    const timestamp = getCurrentTime();
    const newMessage = { text, isUser, timestamp, recommendations: [] };
  
    if (isTypingIndicator) {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    } else {
      if (isUser) {
        setInputMessage('');
      }
      handleUserInteraction();
      if (isRecommendation) {
        // Update recommendations for user messages
        newMessage.recommendations = chatRecommendations.map((recommendation) => recommendation.text);
        setChatRecommendations([]);
      }
      
      // Add only non-recommendation messages to the state
      if (!isRecommendation) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    }
  };
  

  const resetIdleTimeout = () => {
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }

    const newTimeout = setTimeout(() => {
      setShowIdleMessage(true);
    }, 60000); // 60.000 milidetik = 1 menit

    setIdleTimeout(newTimeout);
  };

  const handleUserInteraction = () => {
    resetIdleTimeout();
    setShowIdleMessage(false);
  };

  const handleCloseClick = () => {
    setIsChatbotOpen(false);
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    handleUserInteraction(); // Panggil fungsi ini setiap kali ada interaksi pengguna
  };
  

  const handleSendMessage = async (message) => {
    if (message.trim() === '') return;
  
    addMessage(message, true);
    setShowTypingIndicator(true);
  
    const currentTime = getCurrentTime();
  
    try {
      // Dapatkan DocumentID dari user dengan nama yang sesuai
      const userQuery = query(usersCollection, where('name', '==', name));
      const userQuerySnapshot = await getDocs(userQuery);
  
      if (userQuerySnapshot.empty) {
        console.error('Pengguna tidak ditemukan');
        return;
      }
  
      const userId = userQuerySnapshot.docs[0].id;
  
      const messagesCollection = collection(db, 'messages');
  
      // Tambahkan pesan dari pengguna ke Firestore
      await addDoc(messagesCollection, {
        userId: userId,
        message: message,
        timestamp: serverTimestamp(),
        isUser: true,
      });
  
      axios.post('http://localhost:5000/api/chat', {
        message: message,
      })
      .then((response) => {
        console.log("Respon API:", response.data);
        const { reply, follow_up_intents } = response.data;
        console.log("Respon Bot:", reply);
      
        
        addMessage(reply, false);
      
        
        handleFollowUpIntents(follow_up_intents);
      
        
        setShowTypingIndicator(false);
      
        
        setFollowUpVisible(false); 
      
       
        setFollowUpVisible(true);
      })
      .catch((error) => {
        console.error(error);
        addMessage('Terjadi kesalahan selama pemrosesan.', false);
      })
      .finally(() => {
        handleUserInteraction();
      });  
    } catch (error) {
      console.error('Error saat menyimpan pesan ke Firestore:', error);
    }
  };
  
  const handleFollowUpIntents = (followUpIntents) => {
    if (followUpIntents && Array.isArray(followUpIntents)) {
      setFollowUpIntents(followUpIntents);
      setShowTypingIndicator(false); // Sembunyikan indikator ketik setelah menerima follow-up intents
      setShowIdleMessage(false); // Sembunyikan pesan idle
      setFollowUpVisible(true); // Setelah menerima follow-up intents, tampilkan kembali
    } else {
      console.error('Follow-up intents tidak valid:', followUpIntents);
    }
  };
  
  

  const handleAskBevaClick = () => {
    addMessage('Tanya Beva', true);
    setShowTypingIndicator(true);
    setAskBeva(true);
    setShowAskBevaButton(false);
  
    // Simulasi jawaban Beva setelah beberapa waktu
    setTimeout(() => {
      setShowTypingIndicator(false); // Sembunyikan indikator ketik
      addMessage('Silahkan geser untuk melihat pilihan rekomendasi pertanyaan.', false);
    }, 1000);
  
    // Jawaban Beva setelah pengguna menggeser menu
    setTimeout(() => {
      setShowTypingIndicator(true); // Tampilkan indikator ketik lagi
      addMessage('Saat ini Beva tersedia juga di WhatsApp (0823-1066-7043).', false);
      setShowTypingIndicator(false); // Sembunyikan indikator ketik setelah memberikan jawaban
    }, 3000);
  
    if (messagesRef.current && btnCardsRef.current) {
      const btnCardsElement = btnCardsRef.current;
      messagesRef.current.appendChild(btnCardsElement);
    }
  };
  
  

  const handleCardClick = (category, subcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);

    addMessage(`Menampilkan informasi tentang ${subcategory} pada kategori ${category}.`, false);
  };

  useEffect(() => {
    if (!greetingSet) {
      setMessages([
        {
          text: `Halo, ${name}!\nPerkenalkan aku beva asisten virtual dari berijalan.\nTerima kasih sudah menghubungi beva. Ada yang bisa beva bantu? \n\nSilakan klik tombol di bawah ini untuk mengakses rekomendasi topiknya`,
          isUser: false,
          timestamp: getCurrentTime(),
        },
      ]);
      setGreetingSet(true);
    }
  }, [name, greetingSet]);


  <div>
    <div className="header">
    <img
      src="/close.png" // Ganti dengan path gambar 'x'
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
  </div>


return (
  <div className="chatbot">
    <div className="chatbot-messages">
  {messages.map((message, index) => (
    <div key={index} className={`message ${message.isUser ? 'user' : 'bot'}`}>
      {message.isUser && (
        <div className="user-message">
          {message.text}
          <p className="chatbot-timestamp user-timestamp">{message.timestamp}</p>
        </div>
      )}
      {!message.isUser && (
        <div className="bot-message">
          <div className="bot-profile">
            <img src="/bevaicon.png" alt="Chatbot" width="30" height="30" />
          </div>
          <div className="bot-text">
            {message.text.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </div>
          <p className="chatbot-timestamp bot-timestamp">{message.timestamp}</p>
        </div>
      )}
    </div>
  ))}
  {showTypingIndicator && (
    <div className="bot-message">
      <div className="bot-profile">
        <img src="/bevaicon.png" alt="Chatbot" width="30" height="30" />
      </div>
      <div className="bot-text">...</div>
      <p className="chatbot-timestamp bot-timestamp">{getCurrentTime()}</p>
    </div>
  )}
      {showIdleMessage && (
        <div className="bot-message">
          <div className="bot-profile">
            <img src="/bevaicon.png" alt="Chatbot" width="30" height="30" />
          </div>
          <div className="bot-text">
            Halo, apakah ada pertanyaan lain lagi yang kamu butuhkan saat ini silahkan tanyakan kembali ke beva?
          </div>
          <p className="chatbot-timestamp bot-timestamp">{getCurrentTime()}</p>
        </div>
      )}
    </div>
    {followUpVisible && followUpIntents && Array.isArray(followUpIntents) && (
  <div className="follow-up-intents-container">
    {console.log("Follow-up Intents:", followUpIntents)}
    {followUpIntents.map((intent, index) => (
      <div key={index} className="follow-up-intent">
        {intent.patterns && Array.isArray(intent.patterns) && (
          intent.patterns.map((pattern, patternIndex) => (
            <div key={patternIndex} onClick={() => handleRecommendationClick(pattern)}>
              {pattern}
            </div>
          ))
        )}
      </div>
    ))}
  </div>
)}
    {showFeedbackPopup && (
      <div className="feedback-overlay">
        <div className="feedback-popup">
          <p>Berikan ulasan tentang chatbot kami</p>
          <div>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onClick={() => handleStarClick(star)}
                className={star <= starRating ? 'selected' : ''}
              >
                {star <= starRating ? '★' : '☆'}
              </span>
            ))}
            <p>
              Apabila memiliki kendala lainnya silahkan hubungi{' '}
              <a href="http://care.berijalan.co.id" target="_blank" rel="noopener noreferrer">
                care.berijalan.co.id
              </a>
              .
            </p>
          </div>
          <button onClick={submitFeedback}>Done</button>
        </div>
      </div>
    )}

      {showAskBevaButton && (
        <div className="ask-beva-button" onClick={handleAskBevaClick}>
          Tanya Beva
        </div>
      )}
      {askBeva && (
        <div className="dolphin-btn-cards" ref={btnCardsRef}>
          <div className={`dolphin-btn-cards__item ${selectedCategory === 'Berijalan' ? 'selected' : ''}`}>
            <div className="category-image">
              <img src="/berijalan.png" alt="Category" width="80" height="40" />
            </div>
            <div className="category-text">
              Tentang Berijalan
            </div>
            <div className="subcategory-buttons">
              <div
                className={`subcategory-card ${selectedSubcategory === 'Profil Berijalan' ? 'selected' : ''}`}
                onClick={() => handleSendMessage('Profil Berijalan')}
              >
                Profil Berijalan
              </div>
              <div
                className={`subcategory-card ${selectedSubcategory === 'Kritik & Saran' ? 'selected' : ''}`}
                onClick={() => handleSendMessage('Kritik & Saran')}
              >
                Kritik & Saran
              </div>
              <div
                className={`subcategory-card ${selectedSubcategory === 'Jam Operasional' ? 'selected' : ''}`}
                onClick={() => handleSendMessage('Jam Operasional')}
              >
                Jam Operasional
              </div>
            </div>
          </div>
          <div className={`dolphin-btn-cards__item ${selectedCategory === 'Product/Jasa' ? 'selected' : ''}`}>
            <div className="category-image">
              <img src="/produk.png" alt="Category" width="80" height="40" />
            </div>
            <div className="category-text">
              Produk/Jasa
            </div>
            <div className="subcategory-buttons">
              <div
                className={`subcategory-card ${selectedSubcategory === 'Klien' ? 'selected' : ''}`}
                onClick={() => handleSendMessage('Klien')}
              >
                Klien
              </div>
              <div
                className={`subcategory-card ${selectedSubcategory === 'Konsultasi Produk' ? 'selected' : ''}`}
                onClick={() => handleSendMessage('Konsultasi Produk')}
              >
                Konsultasi Produk
              </div>
              <div
                className={`subcategory-card ${selectedSubcategory === 'Keunggulan' ? 'selected' : ''}`}
                onClick={() => handleSendMessage('Keunggulan')}
              >
                Keunggulan
              </div>
            </div>
          </div>
          <div className={`dolphin-btn-cards__item ${selectedCategory === 'Kemitraan' ? 'selected' : ''}`}>
            <div className="category-image">
              <img src="/kemitraann.png" alt="Category" width="80" height="40" />
            </div>
            <div className="category-text">
              Kemitraan
            </div>
            <div className="subcategory-buttons">
              <div
                className={`subcategory-card ${selectedSubcategory === 'Cara Bergabung' ? 'selected' : ''}`}
                onClick={() => handleSendMessage('Cara Bergabung')}
              >
                Cara Bergabung
              </div>
              <div
                className={`subcategory-card ${selectedSubcategory === 'S & K' ? 'selected' : ''}`}
                onClick={() => handleSendMessage('S & K')}
              >
                S & K
              </div>
              <div
                className={`subcategory-card ${selectedSubcategory === 'Sistem Kerja' ? 'selected' : ''}`}
                onClick={() => handleSendMessage('Sistem Kerja')}
              >
                Sistem Kerja
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="chatbot-input-container">
        <div className="chatbot-input">
          <input
            type="text"
            placeholder="Input pesan..."
            value={inputMessage}
            onChange={handleInputChange}
          />
          <button onClick={() => handleSendMessage(inputMessage)}>
            <img src="/send.png" alt="Send" width="20" height="20" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
