import "./App/vars.css";
import { TwitterPicker } from "react-color";
import GlobalStyles from "./App/GlobalStyles";
import useWebSocket from "react-use-websocket";
import { css, keyframes } from "@emotion/react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { FC, forwardRef, Fragment, useEffect, useRef } from "react";
import { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { add, blur, counter, flush, hold, load, remove, select, setColor, setColorPicker, Typering as TyperingProps, TyperingOnHold, update } from "./store/slices/typering";

const reactAppWsUrl = process.env.REACT_APP_WS_URL;
const wsUrl = reactAppWsUrl ? reactAppWsUrl : `ws://localhost:5000`;

const App: FC = () => {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  const { lastJsonMessage, sendJsonMessage } = useWebSocket(wsUrl, {
    onOpen: () => console.info(`Connected to websocket`),
    onError: (event: Event) => {
      console.error(event);
    },
    shouldReconnect: (event: CloseEvent) => true,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    if (lastJsonMessage) {
      if (lastJsonMessage.action === "add") {
        dispatch(add(lastJsonMessage));
      }
      if (lastJsonMessage.action === "update") {
        dispatch(update(lastJsonMessage));
      }
      if (lastJsonMessage.action === "load") {
        dispatch(load(lastJsonMessage));
      }
      if (lastJsonMessage.action === "remove") {
        dispatch(remove(lastJsonMessage));
      }
      if (lastJsonMessage.action === "flush") {
        dispatch(flush());
      }
      if (lastJsonMessage.action === "counter") {
        dispatch(counter(lastJsonMessage));
      }
    }
  }, [dispatch, lastJsonMessage]);

  // @ts-ignore
  window.flush = (delay) =>
    setTimeout(
      () => {
        dispatch(flush());
        sendJsonMessage({ action: "flush" });
      },
      delay ? delay : 0
    );

  return (
    <Fragment>
      <GlobalStyles />
      <Typerings sendJsonMessage={sendJsonMessage} />
      <Input ref={inputRef} sendJsonMessage={sendJsonMessage} />
      <ColorPicker />
      <Counter />
    </Fragment>
  );
};

const Counter: FC = () => {
  const counter = useAppSelector((store) => store.typering.counter);
  return (
    <div
      css={css`
        position: absolute;
        right: 30px;
        top: 30px;
      `}
    >
      {counter} online
    </div>
  );
};

const blinkCaret = keyframes`
  from, to { opacity: 0 }
  50% { opacity: 1 }
`;

type TyperingsProps = {
  sendJsonMessage: SendJsonMessage;
};

const Typerings: FC<TyperingsProps> = ({ sendJsonMessage, ...props }) => {
  const dispatch = useAppDispatch();
  const collection = useAppSelector((store) => store.typering.collection);
  const color = useAppSelector((store) => store.typering.color);
  const colorPicker = useAppSelector((store) => store.typering.colorPicker);
  const onHold = useAppSelector((store) => store.typering.onHold);

  return (
    <div
      css={css`
        width: 100vw;
        height: 100vh;
        position: absolute;
        top: 0;
        left: 0;
      `}
      onClick={(event) => {
        if (colorPicker) {
          dispatch(setColorPicker(false));
        } else {
          const { clientX, clientY } = event;
          const now = new Date().getTime();
          const typering = {
            id: `${now}:::${navigator.userAgent}`,
            createdAt: now,
            x: clientX,
            y: clientY,
            color,
            text: "",
          };

          dispatch(hold(typering));
          dispatch(select(typering));
        }
      }}
      {...props}
    >
      {Object.entries(collection).map(([id, props]: [id: string, typering: TyperingProps]) => {
        return <Typering key={id} id={id} {...props} />;
      })}
      {onHold ? <Typering {...onHold} /> : !1}
    </div>
  );
};

const Typering: FC<TyperingOnHold> = (props) => {
  const { id, x, y, color, text } = props;
  const active = useAppSelector((store) => store.typering.active);

  return (
    <div
      key={id}
      css={css`
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        color: ${color};
        white-space: nowrap;
        user-select: none;
      `}
    >
      <div
        css={css`
          position: relative;
        `}
      >
        {text}
        {id === active?.id ? <Caret color={color} /> : null}
      </div>
    </div>
  );
};

type CaretProps = { color: string };

const Caret: FC<CaretProps> = ({ children, color, ...props }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      css={css`
        width: 20px;
        height: 20px;
        position: absolute;
        top: -4px;
        right: -14px;
        animation: ${blinkCaret} 0.75s infinite;
      `}
    >
      <path
        fill={color}
        d="M13,19A1,1 0 0,0 14,20H16V22H13.5C12.95,22 12,21.55 12,21C12,21.55 11.05,22 10.5,22H8V20H10A1,1 0 0,0 11,19V5A1,1 0 0,0 10,4H8V2H10.5C11.05,2 12,2.45 12,3C12,2.45 12.95,2 13.5,2H16V4H14A1,1 0 0,0 13,5V19Z"
      />
    </svg>
  );
};

type ColorPickerProps = {};

const ColorPicker: FC<ColorPickerProps> = ({ children, ...props }) => {
  const dispatch = useAppDispatch();
  const color = useAppSelector((store) => store.typering.color);
  const colorPicker = useAppSelector((store) => store.typering.colorPicker);
  const colorSwatchRef = useRef<HTMLDivElement | null>(null);
  const colorPickerRef = useRef<any>(null);

  return (
    <div css={css``} {...props}>
      <div
        ref={colorSwatchRef}
        onClick={() => {
          dispatch(setColorPicker(!colorPicker));
          dispatch(blur());
        }}
        css={css`
          background: ${color};
          height: 30px;
          width: 30px;
          cursor: pointer;
          position: absolute;
          outline: none;
          border-radius: 4px;
          top: 20px;
          left: 20px;
        `}
      ></div>
      {colorPicker ? (
        <TwitterPicker
          ref={colorPickerRef}
          colors={["#FF6900", "#FCB900", "#00D084", "#0693E3", "#EB144C", "#F78DA7", "#9900EF", "#7f8c8d", "#34495e", "#333333"]}
          color={color}
          onChangeComplete={(color, event) => {
            if (event.target.value?.length < 6) return;

            dispatch(setColor(color.hex));
            localStorage.setItem("color", color.hex);
            dispatch(setColorPicker(false));
          }}
          css={css`
            position: absolute;
            top: 35px;
            left: 15px;
          `}
        />
      ) : null}
    </div>
  );
};

type InputProps = {
  sendJsonMessage: SendJsonMessage;
};

const Input = forwardRef<HTMLInputElement, InputProps>(({ ...props }, ref: any) => {
  const dispatch = useAppDispatch();
  const collection = useAppSelector((store) => store.typering.collection);
  const active = useAppSelector((store) => store.typering.active);
  const onHold = useAppSelector((store) => store.typering.onHold);
  const typering = active ? collection[active.id] : undefined;

  useEffect(() => {
    const { current } = ref;
    if (current && active) current.focus();
  }, [ref, active]);

  return (
    <input
      ref={ref}
      css={css`
        opacity: 0;
        ${(onHold || typering) &&
        css`
          position: absolute;
          left: ${onHold?.x || typering?.x}px;
          top: ${onHold?.y || typering?.y}px;
        `}
      `}
      value={typering ? typering.text : ""}
      onChange={(e) => {
        if (active) {
          const typering = { id: active.id, text: e.target.value };
          if (hold) {
            dispatch(add());
            dispatch(update(typering));
            props.sendJsonMessage({ action: "add", ...onHold });
            dispatch(hold(undefined));
            props.sendJsonMessage({ action: "update", ...typering });
          } else {
            props.sendJsonMessage({ action: "update", ...typering });
          }
        }
      }}
      onBlur={(e) => {
        setTimeout(() => {
          const { current } = ref;
          if (current && active) current.focus();
        });
      }}
      onKeyDown={(e) => {
        if (["Tab"].includes(e.key)) e.preventDefault();
      }}
    />
  );
});

export default App;
