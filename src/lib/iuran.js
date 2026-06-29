// Hitung iuran sesi — dipakai bersama oleh halaman Iuran & Rekap.
//
// Model:
//   Member     -> bayar cock saja
//   Non-member -> bayar tarif lapangan flat + cock
//
//   total_biaya_cock    = jumlah_cock_terpakai x harga_cock_per_biji
//   total_slot          = jumlah partisipasi semua pemain (tiap game = 4 slot)
//   biaya_cock_per_slot = total_biaya_cock / total_slot
//   bagian_cock_pemain  = jumlah_game_pemain x biaya_cock_per_slot
//
// attendees: [{ player_id, name, is_member, paid }]
// games:     [{ id, cock_used, played_at, playerIds: [] }]
// sesi:      { cock_price_per_piece, court_fee_nonmember }

export function hitungIuran(sesi, attendees, games) {
  const cockPrice = sesi?.cock_price_per_piece || 0
  const courtFee = sesi?.court_fee_nonmember || 0

  const totalCock = games.reduce((s, g) => s + (g.cock_used || 0), 0)
  const totalBiayaCock = totalCock * cockPrice

  // Jumlah game per pemain + total slot
  const gameCount = {}
  let totalSlot = 0
  for (const g of games) {
    for (const pid of g.playerIds) {
      gameCount[pid] = (gameCount[pid] || 0) + 1
      totalSlot++
    }
  }
  const perSlot = totalSlot > 0 ? totalBiayaCock / totalSlot : 0

  const rows = attendees.map(a => {
    const gamesPlayed = gameCount[a.player_id] || 0
    const cockShare = Math.round(gamesPlayed * perSlot)
    const courtShare = a.is_member ? 0 : courtFee
    const total = courtShare + cockShare
    return {
      player_id: a.player_id,
      name: a.name,
      is_member: a.is_member,
      paid: a.paid,
      gamesPlayed,
      cockShare,
      courtShare,
      total,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  const totalTagihan = rows.reduce((s, r) => s + r.total, 0)
  const totalLunas = rows.filter(r => r.paid).reduce((s, r) => s + r.total, 0)
  const totalBelum = totalTagihan - totalLunas

  const jumlahMember = rows.filter(r => r.is_member).length
  const jumlahNon = rows.length - jumlahMember

  return {
    cockPrice, courtFee,
    totalCock, totalBiayaCock,
    totalSlot, perSlot,
    rows,
    totalTagihan, totalLunas, totalBelum,
    jumlahMember, jumlahNon,
    jumlahGame: games.length,
  }
}

export const rupiah = n => 'Rp ' + (n || 0).toLocaleString('id-ID')
