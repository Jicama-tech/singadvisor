// import React from 'react';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';

function ManageMoneyPage() {
  return (
    <>
      <div style={{ marginTop: '90px' }}></div>
      <Navbar />

      <div className="card-container">
        <div className="card-content">
          {/* Video Section */}
          <div className="video-section">
            <video width="100%" height="auto" controls>
              <source src="/Vedios/trainingvedio.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Content Section */}
          <div className="content-section">
            <h1>Manage Money</h1>
            <p>
              <strong>1. Financial Basics: Income, Expenses, and Budgeting</strong><br />
              Understanding your financial basics starts with managing income, tracking expenses, and creating a budget. These three components are essential for gaining control over your financial health:
              <ul>
                  <li><strong>Income:</strong> Your earnings from salary, business, or investments.</li>
                  <li><strong>Expenses:</strong> The money you spend on essentials and non-essentials, including rent, groceries, entertainment, and more.</li>
                  <li><strong>Budgeting:</strong> Creating a plan that outlines your income, prioritizes expenses, and allocates funds for saving and investing.</li>
              </ul>
            </p>

            <p>
              <strong>2. How to Start with Saving and Investing</strong><br />
              Saving and investing are critical for building wealth and securing your future:
              <ul>
                  <li><strong>Saving:</strong> Set aside a portion of your income regularly, typically into a savings account or emergency fund.</li>
                  <li><strong>Investing:</strong> Allocate funds in assets such as stocks, bonds, or real estate to generate returns over time.</li>
                  <li>Start with small, consistent amounts and increase your investments as your financial situation improves.</li>
              </ul>
            </p>

            <p>
              <strong>3. Basics of Credit and Debt</strong><br />
              Credit and debt are important financial tools but should be managed wisely:
              <ul>
                  <li><strong>Credit:</strong> The ability to borrow money or access goods/services with the understanding that you'll pay later.</li>
                  <li><strong>Debt:</strong> Money owed to creditors, which can accumulate interest over time.</li>
                  <li>Maintain good credit by paying off debts promptly, and use credit wisely to avoid excessive debt.</li>
              </ul>
            </p>

            <p>
              <strong>4. Making Informed Financial Decisions</strong><br />
              Making well-informed decisions requires careful consideration of your current financial situation and future goals:
              <ul>
                  <li>Research financial products and services before committing.</li>
                  <li>Consult with financial advisors when needed.</li>
                  <li>Stay informed about changes in financial markets and regulations.</li>
              </ul>
            </p>

            <p>
              <strong>5. Setting Financial Goals</strong><br />
              Setting realistic financial goals helps you plan for both short-term needs and long-term aspirations:
              <ul>
                  <li>Start by identifying your priorities, such as buying a home, paying off debt, or retirement planning.</li>
                  <li>Break your goals into actionable steps and track your progress regularly.</li>
                  <li>Adjust your goals as your financial situation changes over time.</li>
              </ul>
            </p>

            {/* Register Button */}
            <Link to="https://docs.google.com/forms/d/1Nvr1Kz_yUbyB-xkDd82TE9LEXOztukbTii8XM7db3mU/viewform?edit_requested=true" className="register-button">
              Register Now
            </Link>
          </div>
        </div>
      </div>

      {/* CSS for layout */}
      <style jsx>{`
        .card-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .card-content {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 20px;
        }

        .video-section {
          flex: 1 1 45%;
          margin-bottom: 20px;
        }

        .content-section {
          flex: 1 1 45%;
          text-align: left;
          margin-bottom: 20px;
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
          margin-top: 20px;
        }

        .register-button:hover {
          background-color: #fff;
        }

        @media (max-width: 768px) {
          .card-content {
            flex-direction: column;
          }

          .video-section, .content-section {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </>
  );
}

export default ManageMoneyPage;
