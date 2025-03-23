import { h } from 'nano-jsx';

export default function ErrorMessage({ message }: { message: string }) {
  return <p class="mt-8 text-center">{message}</p>;
}
