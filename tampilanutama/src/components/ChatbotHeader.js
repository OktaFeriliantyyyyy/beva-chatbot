import React from 'react';

const ChatbotHeader = ({ handleCloseClick }) => {
  return (
    <div className="chatbot-header">
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
  );
};

export default ChatbotHeader;