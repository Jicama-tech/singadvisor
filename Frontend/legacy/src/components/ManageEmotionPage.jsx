// import React from 'react'
// import Navbar from './Navbar'
// import { Link } from 'react-router-dom';

// function ManageEmotionPage() {
//   return (
//   <>

//   <div style={{ marginTop: '90px' }}></div>
//       <Navbar />

//     <div className="video-page-container">
//       {/* Video Section */}
//       <div className="video-section">
//         <video width="100%" height="auto" controls>
//           <source src="your-video-url.mp4" type="video/mp4" />
//           Your browser does not support the video tag.
//         </video>
//       </div>

//       {/* Content Section */}
//       <div className="content-section">
//         <h1>Manage Emotion</h1>
//         <p>
//     <strong>1. Introduction to Emotional Intelligence</strong><br />
//     Emotional Intelligence (EI) refers to the ability to recognize, understand, and manage our own emotions and the emotions of others. It plays a crucial role in personal and professional success by improving communication, relationships, and decision-making. Key components of EI include self-awareness, self-regulation, empathy, and social skills.
// </p>

// <p>
//     <strong>2. Understanding Different Emotions</strong><br />
//     Emotions are complex responses to various stimuli, both internal and external. Common types of emotions include:
//     <ul>
//         <li><strong>Happiness:</strong> Linked to pleasure and satisfaction.</li>
//         <li><strong>Sadness:</strong> Often caused by loss or disappointment.</li>
//         <li><strong>Anger:</strong> A response to perceived injustice or threat.</li>
//         <li><strong>Fear:</strong> Triggered by danger or uncertainty.</li>
//         <li><strong>Surprise:</strong> A reaction to unexpected events.</li>
//     </ul>
//     Understanding these emotions helps individuals become more adept at handling situations where emotions are at play.
// </p>

// <p>
//     <strong>3. Self-Awareness and Self-Regulation</strong><br />
//     <strong>Self-Awareness:</strong> The ability to recognize and understand your own emotions, as well as their effects on others.<br />
//     <strong>Self-Regulation:</strong> The capacity to manage or redirect disruptive emotions and impulses. It includes emotional control, adaptability, and a readiness to pursue goals despite emotional challenges.
// </p>

// <p>
//     <strong>4. Empathy and Social Skills</strong><br />
//     <strong>Empathy:</strong> The ability to understand and share the feelings of others. Empathy is crucial in building meaningful connections, fostering trust, and developing strong interpersonal relationships.<br />
//     <strong>Social Skills:</strong> This refers to managing relationships to move people in desired directions. It includes effective communication, conflict management, teamwork, and leadership.
// </p>

// <p>
//     <strong>5. Coping with Negative Emotions</strong><br />
//     Negative emotions like anger, frustration, and sadness are inevitable. Key techniques for coping include:
//     <ul>
//         <li><strong>Mindfulness:</strong> Focusing on the present and accepting emotions without judgment.</li>
//         <li><strong>Positive Reframing:</strong> Viewing challenging situations from a different, more constructive perspective.</li>
//         <li><strong>Seeking Support:</strong> Talking to friends, counselors, or professionals when dealing with overwhelming emotions.</li>
//     </ul>
// </p>


//         {/* Register Button */}
//         <Link to="/" className="register-button">
//           Register Now
//         </Link>
//       </div>

//       {/* CSS for layout */}
//       <style jsx>{`
//         .video-page-container {
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           max-width: 1200px;
//           margin: 0 auto;
//           padding: 20px;
//         }

//         .video-section {
//           width: 100%;
//           margin-bottom: 20px;
//         }

//         .content-section {
//           text-align: center;
//           margin-bottom: 20px;
//         }

//         h1 {
//           font-size: 2rem;
//           margin-bottom: 10px;
//         }

//         p {
//           font-size: 1rem;
//           margin-bottom: 20px;
//         }

//         .register-button {
//           padding: 10px 20px;
//           background-color: #007bff;
//           color: white;
//           text-decoration: none;
//           border-radius: 5px;
//           font-size: 1.2rem;
//         }

//         .register-button:hover {
//           background-color: #0056b3;
//         }
//       `}</style>
//     </div>

//     </>
//   )
// }

// export default ManageEmotionPage

import React from 'react';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';

function ManageEmotionPage() {
  return (
    <>
      <div style={{ marginTop: '90px' }}></div>
      <Navbar />

      <div className="card-container">
        {/* Video Section */}
        <div className="video-section">
          <video width="100%" height="auto" controls style={{ marginTop: '20px' }}>
            <source src="/Vedios/200314 _Work Life_02_ 4k_002.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Content Section */}
        <div className="content-section">
          <h1>Manage Emotion</h1>
          <p>
            <strong>1. Introduction to Emotional Intelligence</strong><br />
            Emotional Intelligence (EI) refers to the ability to recognize, understand, and manage our own emotions and the emotions of others. It plays a crucial role in personal and professional success by improving communication, relationships, and decision-making. Key components of EI include self-awareness, self-regulation, empathy, and social skills.
          </p>

          <p>
            <strong>2. Understanding Different Emotions</strong><br />
            Emotions are complex responses to various stimuli, both internal and external. Common types of emotions include:
            <ul>
              <li><strong>Happiness:</strong> Linked to pleasure and satisfaction.</li>
              <li><strong>Sadness:</strong> Often caused by loss or disappointment.</li>
              <li><strong>Anger:</strong> A response to perceived injustice or threat.</li>
              <li><strong>Fear:</strong> Triggered by danger or uncertainty.</li>
              <li><strong>Surprise:</strong> A reaction to unexpected events.</li>
            </ul>
          </p>

          <p>
            <strong>3. Self-Awareness and Self-Regulation</strong><br />
            <strong>Self-Awareness:</strong> The ability to recognize and understand your own emotions, as well as their effects on others.<br />
            <strong>Self-Regulation:</strong> The capacity to manage or redirect disruptive emotions and impulses.
          </p>

          <p>
            <strong>4. Empathy and Social Skills</strong><br />
            <strong>Empathy:</strong> The ability to understand and share the feelings of others.<br />
            <strong>Social Skills:</strong> This refers to managing relationships to move people in desired directions.
          </p>

          <p>
            <strong>5. Coping with Negative Emotions</strong><br />
            Negative emotions like anger, frustration, and sadness are inevitable. Key techniques for coping include:
            <ul>
              <li><strong>Mindfulness:</strong> Focusing on the present and accepting emotions without judgment.</li>
              <li><strong>Positive Reframing:</strong> Viewing challenging situations from a constructive perspective.</li>
              <li><strong>Seeking Support:</strong> Talking to friends, counselors, or professionals when dealing with overwhelming emotions.</li>
            </ul>
          </p>

          {/* Route Button */}
          <Link to="https://docs.google.com/forms/d/1Nvr1Kz_yUbyB-xkDd82TE9LEXOztukbTii8XM7db3mU/viewform?edit_requested=true" className="register-button">
            Register Now
          </Link>
        </div>

        {/* CSS for layout */}
        <style jsx>{`
          .card-container {
            display: flex;
            flex-wrap: wrap;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 8px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
          }

          .video-section, .content-section {
            flex: 1;
            padding: 20px;
          }

          .video-section {
            max-width: 50%;
          }

          .content-section {
            max-width: 50%;
            text-align: left;
          }

          h1 {
            font-size: 2rem;
            margin-bottom: 10px;
          }

          p {
            font-size: 1rem;
            margin-bottom: 20px;
          }

          .register-button {
            padding: 10px 20px;
            background-color: #90ee90;
            color: black;
            text-decoration: none;
            border-radius: 5px;
            font-size: 1.2rem;
            display: inline-block;
            margin-top: 20px;
          }

          .register-button:hover {
            background-color: #fff;
          }

          @media (max-width: 768px) {
            .card-container {
              flex-direction: column;
            }

            .video-section, .content-section {
              max-width: 100%;
            }

            .video-section {
              order: 1;
            }

            .content-section {
              order: 2;
            }
          }
        `}</style>
      </div>
    </>
  );
}

export default ManageEmotionPage;
