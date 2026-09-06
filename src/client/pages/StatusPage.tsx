import { Link } from 'react-router';
import { todayLocalIso } from '../../shared/dates.ts';
import { useExercises } from '../api/queries.ts';
import ExerciseStatusCard from '../components/ExerciseStatusCard.tsx';

export default function StatusPage() {
  const { data, isPending, isError } = useExercises();
  const today = todayLocalIso();

  return (
    <div className="p-4">
      {isPending && <p>Laster …</p>}

      {isError && <p className="text-red-600">Klarte ikke å hente øvelser.</p>}

      {!isPending && !isError && data.length === 0 && (
        <div className="p-4 text-center text-gray-500">
          <p>Ingen øvelser ennå.</p>
          <Link to="/exercises" className="text-blue-600 underline">
            Legg til en øvelse
          </Link>
        </div>
      )}

      {!isPending && !isError && data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.map((exercise) => (
            <li key={exercise.id}>
              <ExerciseStatusCard exercise={exercise} today={today} />
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/register"
        className="fixed bottom-20 right-4 rounded-full bg-blue-600 px-6 py-3 font-medium text-white shadow-lg"
      >
        Registrer
      </Link>
    </div>
  );
}
