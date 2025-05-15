import { FormEvent, useEffect, useRef, useState } from "react";
import "./middle.css";
import axios from "axios";

const Middle = () => {
  const [linkInput, setLinkInput] = useState("");
  const [downloadStatus, setDownloadStatus] = useState(false);
  const [loadingDots, setLoadingDots] = useState("downloading");
  const [finalMessage, setFinalMessage] = useState<{ message: string } | null>(
    null
  );
  const [isDisabled, setIsDisabled] = useState(false);

  const intervalRef = useRef<number | undefined>(undefined);
  const downloadButton = useRef("");

  async function download(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setIsDisabled(true);
      setFinalMessage(null);
      setDownloadStatus(true);
      const result = await axios.post("http://localhost:3000/download", {
        url: linkInput,
      });
      console.log(result);

      setFinalMessage(result.data);
      setDownloadStatus(false);
      setIsDisabled(false);
    } catch (error) {
      console.log(error);
      setDownloadStatus(false);
    }
  }
  useEffect(() => {
    if (downloadStatus) {
      intervalRef.current = setInterval(() => {
        setLoadingDots((prevDots) => {
          console.log(prevDots); // Now it will show correct values
          return prevDots === "downloading..." ? "downloading" : prevDots + ".";
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current !== undefined) {
        clearInterval(intervalRef.current);
      }
    };
  }, [downloadStatus]); // Keep dependency only on `downloadStatus`

  return (
    <div className="middle">
      <form className="form" onSubmit={download}>
        <input
          type="text"
          placeholder="Enter Youtube Link"
          className="link-input"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
        />
        <button className="download-button" disabled={isDisabled}>
          DOWNLOAD
        </button>
      </form>

      {downloadStatus === false ? (
        <div className="asleep">Asleep</div>
      ) : (
        <div className="downloading">{loadingDots}</div>
      )}

      {finalMessage && (
        <div className="final-message"> {finalMessage.message}</div>
      )}

      <div className="metadata">
        <div>Video Size:</div>
        <div>Speed:</div>
        <div>Percent:</div>
        <div>ETA:</div>
      </div>
    </div>
  );
};

export default Middle;
