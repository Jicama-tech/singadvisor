// import React, { useState, useEffect } from 'react';
// import Navbar from '../components/Navbar';
// import { Link } from 'react-router-dom';
// import Footer from './Footer';


// function Trainings() {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [activeCategory, setActiveCategory] = useState('Student');
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [isMobile, setIsMobile] = useState(false);

//   const categories = ['Student', 'Corporate', 'Professional'];

//   const courses = [
//     { id: 1, title: 'Manage Time', description: '', image: '/Images/Trainingimgae/magaetime.jpg', linkUrl: "/courses/manage-time" },
//     { id: 2, title: 'Manage Money', description: '', image: '/Images/Trainingimgae/managemoney.jpg', linkUrl: "/courses/manage-money" },
//     { id: 3, title: 'Manage Health', description: '', image: '/Images/Trainingimgae/health.jpg', linkUrl: "/events/manage-health" },
//     { id: 4, title: 'Manage Emotion', description: '', image: '/Images/Trainingimgae/emot.webp', linkUrl: "/events/manage-emotion" },
//     { id: 5, title: 'Build Trust in Teams', description: '', image: '/Images/Trainingimgae/trusttem.webp', linkUrl: "/events/build-trust" },
//     { id: 6, title: 'Leadership Skills', description: '', image: 'Images/Trainingimgae/led.webp', linkUrl: "/events/leadership-skills" },
//     { id: 7, title: 'Communication Skills', description: '', image: '/Images/Trainingimgae/communication-skills.jpg', linkUrl: "/events/communication-skills" }
//   ];
  
  

//   const filteredCourses = courses.filter(course =>
//     course.title.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const toggleSidebar = () => {
//     setIsSidebarOpen(!isSidebarOpen);
//   };

//   useEffect(() => {
//     const handleResize = () => {
//       setIsMobile(window.innerWidth <= 768);
//     };

//     handleResize();
//     window.addEventListener('resize', handleResize);

//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   return (
//     <>
//       <div style={{ marginTop: '80px' }}><Navbar /></div>

//       <div className="trainings-container">
//         <header className="trainings-header">
//           <h1>Trainings</h1>
//           <button className="menu-button" onClick={toggleSidebar}>
//             ☰
//           </button>
//         </header>

//         <div className="trainings-content">
//           {/* Left Sidebar */}
//           <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
//             {/* Search Bar */}
//             <div className="search-container">
//               <h2>Search Courses</h2>
//               <div className="search-wrapper">
//                 <input
//                   type="text"
//                   placeholder="Search for a course..."
//                   value={searchTerm}
//                   onChange={e => setSearchTerm(e.target.value)}
//                 />
//                 <button className="search-button">
//                   🔍
//                 </button>
//               </div>
//             </div>

//             {/* Category List */}
//             <div className="category-selector">
//               <h2>Categories</h2>
//               <ul>
//                 {categories.map(category => (
//                   <li
//                     key={category}
//                     onClick={() => setActiveCategory(category)}
//                     className={activeCategory === category ? 'active' : ''}
//                   >
//                     {category}
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           </aside>

//           {/* Main Content */}
//           <main className="main-content">
//             {/* Mobile Search Bar */}
//             {isMobile && (
//               <div className="mobile-search-container">
//                 <input
//                   type="text"
//                   placeholder="Search for a course..."
//                   value={searchTerm}
//                   onChange={e => setSearchTerm(e.target.value)}
//                 />
//                 <button className="search-button">
//                   🔍
//                 </button>
//               </div>
//             )}

//             {/* Courses Grid */}
//             <div className="courses-grid">
//   {filteredCourses.map(course => (
//     <div key={course.id} className="course-card">
//       <img src={course.image} alt={course.title} className="course-image" />
//       <h2>{course.title}</h2>
//       <p>{course.description}</p>
//       <Link to={course.linkUrl} className="enroll-button">
//         Enroll Now
//       </Link>
//     </div>
//   ))}
// </div>
//           </main>
//         </div>

//         <style jsx>{`
//           .trainings-container {
//             max-width: 1200px;
//             margin: 0 auto;
//             padding: 1rem;
//           }

//           .trainings-header {
//             display: flex;
//             justify-content: space-between;
//             align-items: center;
//             margin-bottom: 2rem;
//           }

//           .trainings-header h1 {
//             font-size: 2rem;
//           }

//           .menu-button {
//             display: none;
//             background: none;
//             border: none;
//             cursor: pointer;
//             font-size: 1.5rem;
//           }

//           .trainings-content {
//             display: flex;
//             gap: 2rem;
//           }

//           .sidebar {
//             flex: 1;
//             max-width: 300px;
//           }

//           .search-container, .category-selector {
//             margin-bottom: 2rem;
//           }

//           .search-container h2, .category-selector h2 {
//             font-size: 1.25rem;
//             margin-bottom: 1rem;
//           }

//           .search-wrapper, .mobile-search-container {
//             display: flex;
//             align-items: center;
//           }

//           .search-wrapper input, .mobile-search-container input {
//             flex: 1;
//             padding: 0.5rem;
//             font-size: 1rem;
//             border: 1px solid #ccc;
//             border-radius: 4px 0 0 4px;
//           }

//           .search-button {
//             padding: 0.5rem;
//             background-color: #0ea5e9;
//             color: white;
//             border: none;
//             border-radius: 0 4px 4px 0;
//             cursor: pointer;
//           }

//           .category-selector ul {
//             list-style-type: none;
//             padding: 0;
//           }

//           .category-selector li {
//             padding: 0.5rem 1rem;
//             margin-bottom: 0.5rem;
//             cursor: pointer;
//             border-radius: 4px;
//             transition: all 0.3s ease;
//           }

//           .category-selector li.active {
//             background-color: #0ea5e9;
//             color: white;
//           }

//           .main-content {
//             flex: 3;
//           }

//           .courses-grid {
//             display: grid;
//             grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
//             gap: 1.5rem;
//           }

//           .course-card {
//             background-color: #f9f9f9;
//             border-radius: 8px;
//             box-shadow: 0 4px 8px rgba(0,0,0,0.1);
//             padding: 1rem;
//             display: flex;
//             flex-direction: column;
//             justify-content: space-between;
//           }

//           .course-image {
//             width: 100%;
//             height: auto;
//             border-radius: 8px;
//           }

//           .course-card h2 {
//             font-size: 1.25rem;
//             margin-bottom: 0.5rem;
//           }

//           .course-card p {
//             font-size: 0.9rem;
//             flex-grow: 1;
//           }

//           .enroll-button {
//             padding: 0.5rem 1rem;
//             background-color: #0ea5e9;
//             color: white;
//             border: none;
//             border-radius: 4px;
//             cursor: pointer;
//             margin-top: 1rem;
//             font-size: 1rem;
//           }

//           .mobile-search-container {
//             display: none;
//             margin-bottom: 1rem;
//           }

//           @media (max-width: 1024px) {
//             .trainings-content {
//               flex-direction: column;
//             }

//             .sidebar {
//               max-width: none;
//             }

//             .courses-grid {
//               grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
//             }
//           }

//           @media (max-width: 768px) {
//             .trainings-header h1 {
//               font-size: 1.5rem;
//             }

//             .menu-button {
//               display: block;
//             }

//             .sidebar {
//               position: fixed;
//               top: 0;
//               left: -300px;
//               width: 300px;
//               height: 100vh;
//               background-color: white;
//               box-shadow: 2px 0 5px rgba(0,0,0,0.1);
//               transition: left 0.3s ease;
//               z-index: 1000;
//             }

//             .sidebar.open {
//               left: 0;
//             }

//             .mobile-search-container {
//               display: flex;
//             }
//           }
//         `}</style>
//       </div>
//       {/* <Footer /> */}
//     </>
//   );
// }


// export default Trainings;


import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import WhatsAppButton from '../components/WhatsAppButton';
import Footer from '../components/Footer';


function Trainings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Student');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const categories = ['Student', 'Corporate', 'Professional'];

  const trainings = [
    { id: 1, title: 'Manage Time', description: '', image: '/Images/Trainingimgae/times.webp', linkUrl: "/trainings/managetime", category: 'Student' },
    { id: 2, title: 'Manage Health', description: '', image: '/Images/Trainingimgae/healthfr.webp', linkUrl: "/trainings/managehealth", category: 'Student' },
    { id: 3, title: 'Manage Emotion', description: '', image: '/Images/Trainingimgae/emot.webp', linkUrl: "/trainings/manageemotion", category: 'Student' },
    { id: 4, title: 'Manage Money', description: '', image: '/Images/Trainingimgae/mony.webp', linkUrl: "/trainings/managemoney", category: 'Student' },
    { id: 5, title: 'Build Trust in Teams', description: '', image: '/Images/Trainingimgae/trusttem.webp', linkUrl: "/trainings/build-trust", category: 'Corporate' },
    { id: 6, title: 'Leadership Skills', description: '', image: 'Images/Trainingimgae/led.webp', linkUrl: "/trainings/leadership-skills", category: 'Corporate' },
    { id: 7, title: 'Communication Skills', description: '', image: '/Images/Trainingimgae/comunicat.jpg', linkUrl: "/trainings/communication-skills", category: 'Corporate' }
  ];
  
  // Filter the trainings based on both the active category and search term
  const filteredTrainings = trainings.filter(training =>
    training.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    training.category === activeCategory // This ensures the card matches the selected category
  );
  

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <div style={{ marginTop: '110px' }}><Navbar />
      </div>

      <div className="trainings-container">
        <header className="trainings-header">
          <h1>Trainings</h1>
          <button className="menu-button" onClick={toggleSidebar}>
            ☰
          </button>
        </header>

        <div className="trainings-content">
          {/* Left Sidebar */}
          <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
            {/* Search Bar */}
            <div className="search-container">
              <h2>Search Trainings</h2>
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder="Search for a training..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <button className="search-button">
                  🔍
                </button>
              </div>
            </div>

            {/* Category List */}
            <div className="category-selector">
              <h2>Categories</h2>
              <ul>
                {categories.map(category => (
                  <li
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={activeCategory === category ? 'active' : ''}
                  >
                    {category}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            {/* Mobile Search Bar */}
            {isMobile && (
              <div className="mobile-search-container">
                <input
                  type="text"
                  placeholder="Search for a training..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <button className="search-button">
                  🔍
                </button>
              </div>
            )}

            {/* Trainings Grid */}
            <div className="trainings-grid">
              {filteredTrainings.map(training => (
                <div key={training.id} className="training-card">
                  <img src={training.image} alt={training.title} className="training-image" />
                  <h2>{training.title}</h2>
                  <p>{training.description}</p>
                  <Link to={training.linkUrl} className="enroll-button">
                    Enroll Now
                  </Link>
                </div>
              ))}
            </div>
          </main>
        </div>

        <style jsx>{`
          .trainings-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem;
          }

          .trainings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
          }

          .trainings-header h1 {
            font-size: 2rem;
          }

          .menu-button {
            display: none;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.5rem;
          }

          .trainings-content {
            display: flex;
            gap: 2rem;
          }

          .sidebar {
            flex: 1;
            max-width: 300px;
          }

          .search-container, .category-selector {
            margin-bottom: 2rem;
          }

          .search-container h2, .category-selector h2 {
            font-size: 1.25rem;
            margin-bottom: 1rem;
          }

          .search-wrapper, .mobile-search-container {
            display: flex;
            align-items: center;
          }

          .search-wrapper input, .mobile-search-container input {
            flex: 1;
            padding: 0.5rem;
            font-size: 1rem;
            border: 1px solid #ccc;
            border-radius: 4px 0 0 4px;
          }

          .search-button {
            padding: 0.5rem;
            background-color: #90ee90;;
            color: white;
            border: none;
            border-radius: 0 4px 4px 0;
            cursor: pointer;
          }

          .category-selector ul {
            list-style-type: none;
            padding: 0;
          }

          .category-selector li {
            padding: 0.5rem 1rem;
            margin-bottom: 0.5rem;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.3s ease;
          }

          .category-selector li.active {
            background-color: #90ee90;;
            color: white;
          }

          .main-content {
            flex: 3;
          }

          .trainings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
          }

          .training-card {
            background-color: #f9f9f9;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            padding: 1rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .training-image {
            width: 100%;
            height: auto;
            border-radius: 8px;
          }

          .training-card h2 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
          }

          .training-card p {
            font-size: 0.9rem;
            flex-grow: 1;
          }

          .enroll-button {
            padding: 0.5rem 1rem;
            background-color: #90ee90;
            color: black;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 1rem;
            font-size: 1rem;
            text-decoration: none; 
            display: inline-block; /* To ensure button behaves like a block */
            text-align: center;

          }
          .enroll-button:hover {
            background-color: #fff; /* Set the hover color */
            transform: scale(1.05);
          }

          .mobile-search-container {
            display: none;
            margin-bottom: 1rem;
          }

          @media (max-width: 1024px) {
            .trainings-content {
              flex-direction: column;
            }

            .sidebar {
              max-width: none;
            }

            .trainings-grid {
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            }
          }

          @media (max-width: 768px) {
            .trainings-header h1 {
              font-size: 1.5rem;
            }

            .menu-button {
              display: block;
            }

            .sidebar {
               position: fixed;
               top: 0;
               left: -300px;
              width: 300px;
               height: 100vh;
               background-color: white;
               box-shadow: 2px 0 5px rgba(0,0,0,0.1);
               transition: left 0.3s ease;
               z-index: 1000;
             }

            .sidebar.open {
              left: 0;
             }

             .mobile-search-container {
               display: flex;
            }
           }
           .training-card {
            background-color: #f9f9f9;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            padding: 1rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.3s ease-in-out; 
           
          }
          
          .training-image {
            width: 100%; /* Full width of the card */
            height: 150px; /* Fixed height */
            object-fit: cover; /* Ensure the image fills the box proportionally */
            border-radius: 8px; /* Keep the rounded corners */
          }
          .trainings-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr); /* 4 cards per row */
            gap: 1.5rem;
          }
        
          @media (max-width: 1024px) {
            .trainings-grid {
              grid-template-columns: repeat(3, 1fr); /* 3 cards per row for tablets */
            }
          }
        
          @media (max-width: 768px) {
            .trainings-grid {
              grid-template-columns: repeat(2, 1fr); /* 2 cards per row for mobile */
            }
          }
        
          @media (max-width: 480px) {
            .trainings-grid {
              grid-template-columns: 1fr; /* 1 card per row for small mobile */
            }
          }
          .training-card:hover {
            transform: scale(1.05); /* Hover effect to enlarge */
          }

          
          


        `}</style>
      </div>
      <WhatsAppButton />
      <Footer />
    </>
  );
}

export default Trainings;
