import { Accessor } from "ags";

interface SeparatorProps {
  visible?: boolean | Accessor<boolean>;
}

export default function Separator({ visible = true }: SeparatorProps) {
  return (
    <label visible={visible} cssClasses={["separator", "module"]} label="" />
  );
}
