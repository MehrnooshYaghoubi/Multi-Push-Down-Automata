import {
  VscChromeMaximize,
  VscChromeMinimize,
  VscClose,
} from 'react-icons/vsc';
import appIcon from '../../../assets/icon.png';
import '../styles/TitleBar.css';

function TitleBar() {
  const handleMinimize = () => {
    window.electron.controlWindow('minimize');
  };

  const handleMaximize = () => {
    window.electron.controlWindow('maximize');
  };

  const handleClose = () => {
    window.electron.controlWindow('close');
  };

  return (
    <div className="title-bar">
      <div className="title-bar-title">
        <img
          className="title-bar-icon"
          src={appIcon}
          alt=""
          draggable="false"
        />
        Multi PushDown Automata
      </div>
      <div className="title-bar-controls">
        <button type="button" onClick={handleMinimize}>
          <VscChromeMinimize />
        </button>
        <button type="button" onClick={handleMaximize}>
          <VscChromeMaximize />
        </button>
        <button type="button" onClick={handleClose}>
          <VscClose />
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
