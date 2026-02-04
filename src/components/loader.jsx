import { useNavigate } from "react-router";
import gif from "../assets/BLIPPYPIXEL-OH_GLOBBITS.GIF";

export function Loader() {
  const navigate = useNavigate();
  return (
    <div className="w-screen h-screen flex flex-col gap-4 items-center justify-center bg-neutral-900">
      <div
        className="cursor-pointer bg-neutral-600 px-3 py-1 rounded-2xl text-neutral-100 font-Bricolage text-4xl font-bold hover:underline"
        onClick={() => navigate("/")}
      >
        Back to login
      </div>
      <img src={gif} className="border border-neutral-800" />
    </div>
  );
}
