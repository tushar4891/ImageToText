import React, { useEffect, useState } from "react";
import "./App.css";
import Tesseract from "tesseract.js";
import axios from "axios";
import { io } from "socket.io-client";

function App() {
  //   const socket = io("http://localhost:8000");
  const socket = io("https://imagetotext-moen.onrender.com");

  const [file, setFile] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  useEffect(() => {
    socket.on("progress", (data) => {
      // Round the progress value to two decimal places
      const roundedProgress = Math.round(data * 100);
      setUploadProgress(roundedProgress);
    });
  }, []);

  const processImage = async () => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await axios.post(
        "http://localhost:8000/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setCandidates(response.data);
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  return (
    <div className="mt-5" style={{ textAlign: "center" }}>
      <input type="file" name="pollImage" onChange={onFileChange} />
      <button className="btn text-white btn-info" onClick={processImage}>
        Submit
      </button>

      {uploadProgress > 0 && (
        <div className="d-flex justify-content-center mt-4">
          <div className="progressbar ">
            <div
              className="progressbar-fill"
              style={{ width: `${uploadProgress}%` }}
            >
              {uploadProgress}%
            </div>
          </div>
        </div>
      )}

      {uploadProgress === 100 && (
        <div className="mt-3">
          <h2>Candidates</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Father/Husband Name</th>
                <th className="pe-5">House Number</th>
                <th className="pe-5 align-center">Age</th>
                <th>Gender</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate, index) => (
                <tr key={index}>
                  <td>{candidate.name}</td>
                  <td>{candidate.fname}</td>
                  <td>{candidate.address}</td>
                  <td className="align-center">{candidate.age}</td>
                  <td>{candidate.gender}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
