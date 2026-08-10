
// import React from 'react';
// import Navbar from '../components/Navbar';
// import Footer from '../components/Footer';

// function Contact() {
//   return (
//     <div className="font-sans container py-5">
//       <Navbar />
//       <h1 className="text-2xl text-center mb-4 mt-5">Contact Us</h1>
//       <h4 className="text-center mb-9 text-3xl">
//         Better yet, see us in person! We love our customers, so feel free to visit during normal business hours.
//         </h4>


//       <div className="row bg-gray-100 rounded-lg shadow-md overflow-hidden">
//         <div className="col-lg-6 p-4">
//           <h2 className="text-xl mb-4">Get in Touch</h2>
//           <form className="d-flex flex-column space-y-3">
//             <input
//               type="text"
//               placeholder="Full Name"
//               required
//               className="form-control mb-3 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
//             />
//             <input
//               type="email"
//               placeholder="Email Address"
//               required
//               className="form-control mb-3 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
//             />
//             <input
//               type="text"
//               placeholder="Subject"
//               required
//               className="form-control mb-3 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
//             />
//             <textarea
//               placeholder="Message"
//               required
//               className="form-control mb-3 p-3 rounded-md h-32 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
//             />
//             <button
//               type="submit"
//               className="btn btn-primary w-100 p-3 rounded-md"
//             >
//               Send Message
//             </button>
//           </form>
//         </div>
//         <Footer/>
//       </div>

//       <div className="row mt-4">
//         <ContactInfo icon="📍" content="8 UBI ROAD 2 #07-12 {ZERVEX), SINGAPORE 408538" />
//         <ContactInfo icon="📞" content="+65 9237 7656" />
//         <ContactInfo icon="🌐" content="https://singadvisor.com/" />
//       </div>
//     </div>
//   );
// }

// function ContactInfo({ icon, content }) {
//   return (
//     <div className="col-sm-6 col-lg-3 d-flex align-items-center mb-3">
//       <span className="bg-indigo-600 text-white p-2 rounded-full me-2">{icon}</span>
//       <span>{content}</span>
//     </div>
//   );
// }

// export default Contact;

import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const web3formsUrl = "https://api.web3forms.com/submit"; // Web3Forms API endpoint
    const accessKey = "5e79bc2e-6770-477d-9807-5b773a015784";// Replace with your Web3Forms API key

    try {
      const response = await fetch(web3formsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          access_key: accessKey,
          ...formData
        })
      });

      if (response.ok) {
        alert("Message sent successfully!");
        setFormData({ name: '', email: '', subject: '', message: '' }); // Clear form
      } else {
        alert("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ marginTop: '70px' }}></div>
      <div className="font-sans container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <Navbar />
        <h1 className="text-2xl text-center mb-4 mt-5">Contact Us</h1>
        <h4 className="text-center mb-9 text-3xl">
          Better yet, see us in person! We love our customers, so feel free to visit during normal business hours.
        </h4>

        <div className="row bg-gray-100 rounded-lg shadow-md overflow-hidden" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="col-lg-12 p-4">
            <h2 className="text-xl mb-4">Get in Touch</h2>
            <form className="d-flex flex-column space-y-3" onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                required
                value={formData.name}
                onChange={handleChange}
                className="form-control mb-3 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                value={formData.email}
                onChange={handleChange}
                className="form-control mb-3 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                name="subject"
                placeholder="Subject"
                required
                value={formData.subject}
                onChange={handleChange}
                className="form-control mb-3 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <textarea
                name="message"
                placeholder="Message"
                required
                value={formData.message}
                onChange={handleChange}
                className="form-control mb-3 p-3 rounded-md h-32 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="btn btn-primary w-100 p-3 rounded-md focus:outline-none"
                style={{ backgroundColor: '#90ee90', color: 'black' }}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>

        <div className="row mt-1" style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'unset', flexWrap: 'wrap', justifyContent: 'space-around' }}>
          <ContactInfo icon="📍" content="8 UBI ROAD 2 #07-12 (ZERVEX), SINGAPORE 408538" />
          <ContactInfo icon="📞" content="+65 9237 7656" />
          <ContactInfo icon="🌐" content="https://singadvisor.com/" />
        </div>
      </div>
      <WhatsAppButton />
      <Footer />
    </>
  );
}

function ContactInfo({ icon, content }) {
  return (
    <div className="flex items-center mb-3 w-full sm:w-1/3 md:w-1/4 px-2">
      <span className="bg-indigo-600 text-white p-2 rounded-full me-2">{icon}</span>
      <span className="text-center">{content}</span>
    </div>
  );
}

export default Contact;



// import React, { useState } from 'react';
// import Navbar from '../components/Navbar';
// import Footer from '../components/Footer';


// export default function Contact() {
//   const [result, setResult] = React.useState("");

//   const onSubmit = async (event) => {
//     event.preventDefault();
//     setResult("Sending....");
//     const formData = new FormData(event.target);

//     formData.append("access_key", "af4e2a7c-dfeb-4601-bdb5-3b548ff3b27a");

//     const response = await fetch("https://api.web3forms.com/submit", {
//       method: "POST",
//       body: formData
//     });

//     const data = await response.json();

//     if (data.success) {
//       setResult("Form Submitted Successfully");
//       event.target.reset();
//     } else {
//       console.log("Error", data);
//       setResult(data.message);
//     }
//   };

//   return (
//     <div>
//       <form onSubmit={onSubmit}>
//         <input type="text" name="name" required/>
//         <input type="email" name="email" required/>
//         <textarea name="message" required></textarea>

//         <button type="submit">Submit Form</button>

//       </form>
//       <span>{result}</span>

//     </div>
//   );
// }