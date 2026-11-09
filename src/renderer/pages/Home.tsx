import { type ChangeEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa6';
import { MdSimCardDownload } from 'react-icons/md';
import { BsCollection } from 'react-icons/bs';
import gridImage from '../../../assets/cover-grid.png';
import appIcon from '../../../assets/icon.png';
import { useFlash } from '../components/FlashMessage';
import ExampleLibrary from '../components/ExampleLibrary';
import { machine, errorMessage } from '../lib/machine';
import '../styles/App.css';

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExamples, setShowExamples] = useState(false);
  const { show: showFlash, node: flashNode } = useFlash();
  const navigate = useNavigate();

  const onLoadFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset first, so picking the same file twice still fires `change`.
    event.target.value = '';
    if (!file) return;
    try {
      await machine.load(file.path);
      navigate('/exec');
    } catch (e) {
      showFlash(errorMessage(e));
    }
  };

  return (
    <div className="main">
      {flashNode}
      {showExamples && (
        <ExampleLibrary
          onClose={() => setShowExamples(false)}
          onLoaded={() => {
            setShowExamples(false);
            navigate('/exec');
          }}
          onError={showFlash}
        />
      )}
      <div className="content">
        <img
          src={appIcon}
          alt=""
          draggable="false"
          // `.main img` in App.css pins the background grid to the bottom of
          // the screen; these overrides keep the logo in the normal flow.
          style={{
            position: 'relative',
            bottom: 'auto',
            width: 110,
            height: 110,
            marginBottom: 18,
          }}
        />
        <h1>Multi Pushdown Automata</h1>
        <p>Made By Mehrnoosh Yaghoubi</p>
        <div className="btnCont">
          <button type="button" onClick={() => navigate('/setVar')}>
            <span style={{ marginRight: 10 }}>Start</span>
            <FaArrowRight id="startIcon" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ marginLeft: 20 }}
          >
            <input
              type="file"
              accept="application/json,.json"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={onLoadFileChange}
            />
            <span style={{ marginRight: 10 }}>Load</span>
            <MdSimCardDownload id="startIcon" />
          </button>

          <button
            type="button"
            onClick={() => setShowExamples(true)}
            style={{ marginLeft: 20 }}
          >
            <span style={{ marginRight: 10 }}>Examples</span>
            <BsCollection id="startIcon" />
          </button>
        </div>
      </div>
      <img src={gridImage} alt="" draggable="false" />
    </div>
  );
}
