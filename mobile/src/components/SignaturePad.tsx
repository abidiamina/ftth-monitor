import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'

type SignaturePoint = {
  x: number
  y: number
}

type SignaturePadProps = {
  clearSignal: number
  onChange: (payload: string, hasSignature: boolean) => void
  onDrawingChange?: (isDrawing: boolean) => void
}

const distance = (a: SignaturePoint, b: SignaturePoint) =>
  Math.hypot(a.x - b.x, a.y - b.y)

const interpolateStroke = (rawPoints: SignaturePoint[]) => {
  if (rawPoints.length === 0) {
    return []
  }

  const dense: SignaturePoint[] = [rawPoints[0]]
  for (let index = 1; index < rawPoints.length; index += 1) {
    const start = rawPoints[index - 1]
    const end = rawPoints[index]
    const segmentLength = distance(start, end)
    const steps = Math.max(1, Math.ceil(segmentLength / 1.4))

    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps
      dense.push({
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      })
    }
  }

  return dense
}

export function SignaturePad({ clearSignal, onChange, onDrawingChange }: SignaturePadProps) {
  const [points, setPoints] = useState<SignaturePoint[]>([])
  const pointsRef = useRef<SignaturePoint[]>([])

  useEffect(() => {
    setPoints([])
    pointsRef.current = []
    onChange('', false)
  }, [clearSignal, onChange])

  const serialized = useMemo(() => {
    if (points.length < 2) {
      return ''
    }

    const compact = points
      .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
      .join(';')

    return `DRAWN_SIGNATURE:${compact}`
  }, [points])

  useEffect(() => {
    onChange(serialized, points.length >= 2)
  }, [serialized, points.length, onChange])

  const strokePoints = useMemo(() => interpolateStroke(points), [points])

  const pushPoint = (x: number, y: number) => {
    const nextPoint = { x: Math.max(0, x), y: Math.max(0, y) }
    const previous = pointsRef.current[pointsRef.current.length - 1]
    if (previous && distance(previous, nextPoint) < 1.1) {
      return
    }

    const next = [...pointsRef.current, nextPoint]
    pointsRef.current = next
    setPoints(next)
  }

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          onDrawingChange?.(true)
          pushPoint(event.nativeEvent.locationX, event.nativeEvent.locationY)
        },
        onPanResponderMove: (event) => {
          pushPoint(event.nativeEvent.locationX, event.nativeEvent.locationY)
        },
        onPanResponderRelease: () => {
          onDrawingChange?.(false)
        },
        onPanResponderTerminate: () => {
          onDrawingChange?.(false)
        },
      }),
    [onDrawingChange]
  )

  return (
    <View>
      <View style={styles.pad} {...responder.panHandlers}>
        {points.length === 0 ? (
          <Text style={styles.placeholder}>Signe ici avec ton doigt</Text>
        ) : null}
        {strokePoints.map((point, index) => (
          <View
            key={`${Math.round(point.x * 10)}-${Math.round(point.y * 10)}-${index}`}
            style={[
              styles.brushDot,
              {
                left: point.x - 2.2,
                top: point.y - 2.2,
              },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pad: {
    height: 170,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    position: 'absolute',
    left: 14,
    top: 14,
    color: colors.muted,
    fontSize: 14,
  },
  brushDot: {
    position: 'absolute',
    width: 4.4,
    height: 4.4,
    borderRadius: 3,
    backgroundColor: '#0f172a',
  },
})
